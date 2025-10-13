# n8n 异步队列架构设计

## 一、整体架构

```
前端小程序
    ↓ (HTTP POST)
入口工作流 (Entry Workflow)
    ↓ (写入Redis队列)
Redis任务队列
    ↓ (Worker轮询)
处理工作流 (Worker Workflow)
    ↓ (并发调用)
Google AI API (多密钥轮询)
    ↓ (回调)
云函数 (通知前端)
```

## 二、核心组件设计

### 2.1 Redis队列结构

```javascript
// 队列Key命名
task_queue:photography:pending    // 待处理任务队列 (LIST)
task_queue:photography:processing // 处理中任务集合 (SET)
task_queue:photography:failed     // 失败任务队列 (LIST)
task_status:{taskId}              // 任务状态Hash (HASH)
api_keys:google:available         // 可用API密钥池 (LIST)
api_keys:google:busy              // 使用中API密钥 (SET)
api_keys:google:rate_limit        // 限流中密钥 (SET, 带TTL)

// 任务状态结构
{
  taskId: "task_xxx",
  status: "pending|processing|completed|failed",
  userId: "user_openid",
  mode: "normal|photo_set",
  images: ["cloud://url1", "cloud://url2"],
  params: {
    scene: "商业摄影",
    style: "现代简约",
    count: 9  // 套图数量
  },
  prompts: {
    base: "系统基础提示词",
    frontend: "前端参数组装的提示词",
    action: "LLM生成的动作提示词",
    final: "最终合成提示词"
  },
  results: [],
  errors: [],
  retryCount: 0,
  createdAt: "2025-10-13T00:00:00.000Z",
  updatedAt: "2025-10-13T00:00:00.000Z"
}
```

### 2.2 API密钥轮询机制

```javascript
// API密钥配置格式
{
  key: "AIzaSy...",
  weight: 10,           // 权重(用于负载均衡)
  maxConcurrent: 3,     // 最大并发数
  currentUsage: 0,      // 当前使用数
  rateLimitUntil: null, // 限流截止时间
  errorCount: 0,        // 错误计数
  lastUsed: "2025-10-13T00:00:00.000Z"
}

// 密钥选择算法
1. 过滤掉限流中的密钥
2. 按权重和当前使用率排序
3. 选择负载最低的可用密钥
4. 标记为busy状态
5. 使用完成后释放回available
```

### 2.3 错误码分类与重试策略

```javascript
// 可重试错误 (Retriable Errors)
const RETRIABLE_ERRORS = {
  'RATE_LIMIT_EXCEEDED': {
    retry: true,
    switchKey: true,        // 切换API密钥
    backoff: 60000,         // 等待60秒
    maxRetries: 5
  },
  'INTERNAL_ERROR': {
    retry: true,
    switchKey: false,
    backoff: 5000,          // 等待5秒
    maxRetries: 3
  },
  'TIMEOUT': {
    retry: true,
    switchKey: false,
    backoff: 10000,
    maxRetries: 3
  },
  'SERVICE_UNAVAILABLE': {
    retry: true,
    switchKey: true,
    backoff: 30000,
    maxRetries: 3
  }
};

// 不可重试错误 (Non-Retriable Errors)
const NON_RETRIABLE_ERRORS = [
  'INVALID_PROMPT',           // 提示词违规
  'INVALID_API_KEY',          // API密钥无效
  'INVALID_IMAGE_FORMAT',     // 图片格式错误
  'CONTENT_POLICY_VIOLATION', // 内容违规
  'INSUFFICIENT_QUOTA'        // 配额不足
];
```

## 三、工作流设计

### 3.1 入口工作流 (photography-entry-workflow)

**节点列表：**

1. **Webhook节点** - 接收HTTP请求
2. **验证请求节点** (Code) - 验证参数
3. **生成任务ID节点** (Code) - 创建taskId
4. **写入Redis队列节点** (Redis) - LPUSH到pending队列
5. **立即响应节点** (HTTP Response) - 返回taskId
6. **触发Worker节点** (HTTP Request) - 异步调用worker

```javascript
// 节点3: 生成任务ID
const body = $input.item.json.body;
const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const task = {
  taskId,
  status: 'pending',
  userId: body.userId,
  mode: body.mode || 'normal',
  images: body.images,
  params: body.params,
  prompts: {
    frontend: body.prompt || ''
  },
  results: [],
  errors: [],
  retryCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

return { json: task };
```

### 3.2 处理工作流 (photography-worker-workflow)

**节点列表：**

1. **定时触发节点** (Cron/Interval) - 每10秒轮询一次
2. **从队列获取任务节点** (Redis) - RPOP获取任务
3. **判断任务是否存在节点** (IF) - 无任务则结束
4. **下载服装图片节点** (HTTP Request)
5. **转换Base64节点** (Code) - 图片转base64
6. **提示词合成流程** (Sub-workflow)
   - 6.1 获取系统基础提示词
   - 6.2 调用LLM生成动作提示词
   - 6.3 合成最终提示词
7. **获取可用API密钥节点** (Redis + Code)
8. **批量生成图片节点** (Loop) - 根据count循环
9. **调用Google AI API节点** (HTTP Request)
10. **解析AI响应节点** (Code)
11. **错误处理节点** (IF + Switch)
12. **上传到腾讯云COS节点** (HTTP Request)
13. **更新任务状态节点** (Redis)
14. **回调云函数节点** (HTTP Request)
15. **释放API密钥节点** (Redis)

```javascript
// 节点5: 转换Base64
const imageBuffer = $input.item.binary.data;
const base64Image = imageBuffer.toString('base64');
return {
  json: {
    base64: base64Image,
    mimeType: 'image/jpeg'
  }
};

// 节点7: 获取可用API密钥
const availableKeys = await $redis.lrange('api_keys:google:available', 0, -1);
const busyKeys = await $redis.smembers('api_keys:google:busy');
const rateLimitKeys = await $redis.smembers('api_keys:google:rate_limit');

// 过滤可用密钥
const keys = availableKeys
  .filter(k => !busyKeys.includes(k) && !rateLimitKeys.includes(k))
  .map(k => JSON.parse(k))
  .sort((a, b) => (a.currentUsage / a.weight) - (b.currentUsage / b.weight));

if (keys.length === 0) {
  throw new Error('NO_AVAILABLE_API_KEYS');
}

const selectedKey = keys[0];

// 标记为busy
await $redis.sadd('api_keys:google:busy', JSON.stringify(selectedKey));

return { json: { apiKey: selectedKey.key, keyId: selectedKey.id } };

// 节点9: 调用Google AI API
const prompt = $node["提示词合成"].json.finalPrompt;
const base64Image = $node["转换Base64"].json.base64;
const apiKey = $node["获取可用API密钥"].json.apiKey;

// Google AI (Imagen) API格式
const response = await $http.post(
  `https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT/locations/us-central1/publishers/google/models/imagegeneration@006:predict`,
  {
    instances: [{
      prompt: prompt,
      image: {
        bytesBase64Encoded: base64Image
      },
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
        safetyFilterLevel: "block_some",
        personGeneration: "allow_adult"
      }
    }]
  },
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  }
);

return { json: response.data };

// 节点11: 错误处理
const error = $input.item.json.error;
const errorCode = error.code || 'UNKNOWN_ERROR';
const task = $node["从队列获取任务"].json;

if (RETRIABLE_ERRORS[errorCode]) {
  const retryConfig = RETRIABLE_ERRORS[errorCode];

  if (task.retryCount < retryConfig.maxRetries) {
    // 可重试
    task.retryCount++;
    task.errors.push({
      code: errorCode,
      message: error.message,
      timestamp: new Date().toISOString(),
      retry: task.retryCount
    });

    if (retryConfig.switchKey) {
      // 标记当前密钥为rate limit
      const keyId = $node["获取可用API密钥"].json.keyId;
      await $redis.sadd('api_keys:google:rate_limit', keyId);
      await $redis.expire(`api_keys:google:rate_limit:${keyId}`, retryConfig.backoff / 1000);
    }

    // 延迟后重新入队
    setTimeout(() => {
      $redis.lpush('task_queue:photography:pending', JSON.stringify(task));
    }, retryConfig.backoff);

    return { json: { action: 'retry', task } };
  } else {
    // 超过最大重试次数
    task.status = 'failed';
    await $redis.lpush('task_queue:photography:failed', JSON.stringify(task));
    return { json: { action: 'failed', task } };
  }
} else {
  // 不可重试错误，直接失败
  task.status = 'failed';
  task.errors.push({
    code: errorCode,
    message: error.message,
    timestamp: new Date().toISOString(),
    retriable: false
  });
  await $redis.lpush('task_queue:photography:failed', JSON.stringify(task));
  return { json: { action: 'failed_permanent', task } };
}
```

### 3.3 提示词合成子工作流 (prompt-composition-workflow)

**节点列表：**

1. **接收参数节点** (Webhook/Execute Workflow Trigger)
2. **获取系统基础提示词节点** (Code) - 从模板库读取
3. **解析前端参数节点** (Code) - 提取场景、风格等
4. **调用LLM生成动作节点** (HTTP Request) - 调用GPT-4/Claude
5. **合成最终提示词节点** (Code) - 三层合并

```javascript
// 节点2: 获取系统基础提示词
const scene = $input.item.json.params.scene;
const mode = $input.item.json.mode;

const SYSTEM_PROMPTS = {
  'normal': {
    '商业摄影': 'Professional commercial photography of clothing on model, studio lighting, high resolution, clean background, fashion editorial style',
    '户外场景': 'Outdoor fashion photography, natural lighting, lifestyle setting, model wearing clothing in natural environment',
    '创意风格': 'Creative fashion photography, artistic composition, unique perspective, editorial style'
  },
  'photo_set': {
    '商业摄影': 'Professional fashion lookbook photography series, multiple angles and poses, consistent lighting and style, commercial presentation'
  }
};

const basePrompt = SYSTEM_PROMPTS[mode][scene] || SYSTEM_PROMPTS['normal']['商业摄影'];

return { json: { basePrompt } };

// 节点4: 调用LLM生成动作提示词
const scene = $input.item.json.params.scene;
const style = $input.item.json.params.style;
const count = $input.item.json.params.count || 1;

const llmPrompt = `你是一个专业的服装摄影指导师。请为以下场景生成${count}个不同的模特动作和姿势描述。

场景: ${scene}
风格: ${style}
数量: ${count}张

要求:
1. 每个动作要具体明确（例如：双手插口袋，侧身45度看向镜头）
2. 动作要符合服装展示的商业摄影标准
3. 如果是套图，动作要有变化但保持风格一致
4. 用英文输出，便于AI图像生成模型理解

请以JSON数组格式返回: ["action1", "action2", ...]`;

const response = await $http.post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: '你是一个专业的服装摄影指导师' },
    { role: 'user', content: llmPrompt }
  ],
  temperature: 0.8,
  response_format: { type: 'json_object' }
}, {
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const actions = JSON.parse(response.data.choices[0].message.content).actions;
return { json: { actions } };

// 节点5: 合成最终提示词
const basePrompt = $node["获取系统基础提示词"].json.basePrompt;
const frontendParams = $input.item.json.params;
const actions = $node["调用LLM生成动作"].json.actions;

// 组装前端参数部分
const frontendPrompt = [
  frontendParams.scene ? `Scene: ${frontendParams.scene}` : '',
  frontendParams.style ? `Style: ${frontendParams.style}` : '',
  frontendParams.background ? `Background: ${frontendParams.background}` : '',
  frontendParams.color ? `Color tone: ${frontendParams.color}` : ''
].filter(Boolean).join(', ');

// 合成最终提示词数组（套图模式返回多个）
const finalPrompts = actions.map((action, index) => {
  return `${basePrompt}. ${frontendPrompt}. Model action: ${action}. High quality, professional photography, 4K resolution.`;
});

return {
  json: {
    finalPrompts,
    breakdown: {
      base: basePrompt,
      frontend: frontendPrompt,
      actions: actions
    }
  }
};
```

## 四、套图并发处理策略

### 4.1 并发控制

```javascript
// 9张图并发生成策略
const count = 9;
const maxConcurrentPerKey = 3;  // 每个密钥最多3个并发
const requiredKeys = Math.ceil(count / maxConcurrentPerKey); // 需要3个密钥

// 获取多个API密钥
const apiKeys = await getMultipleApiKeys(requiredKeys);

// 分组并发
const batches = [];
for (let i = 0; i < count; i++) {
  const keyIndex = Math.floor(i / maxConcurrentPerKey);
  const apiKey = apiKeys[keyIndex];
  const prompt = finalPrompts[i];

  batches.push({
    index: i,
    apiKey: apiKey,
    prompt: prompt
  });
}

// 使用Promise.all并发执行
const results = await Promise.all(
  batches.map(batch => generateImage(batch))
);
```

### 4.2 进度回调

```javascript
// 每完成一张图就回调一次
async function generateImageWithCallback(batch, task) {
  try {
    const result = await callGoogleAI(batch);

    // 上传到COS
    const cosUrl = await uploadToCOS(result.image);

    // 更新Redis任务状态
    task.results.push({
      index: batch.index,
      url: cosUrl,
      timestamp: new Date().toISOString()
    });
    task.updatedAt = new Date().toISOString();
    await $redis.hset(`task_status:${task.taskId}`, 'data', JSON.stringify(task));

    // 回调云函数通知前端
    await $http.post('https://your-cloud-function/photography/callback', {
      taskId: task.taskId,
      status: 'processing',
      progress: task.results.length / task.params.count,
      currentResult: {
        index: batch.index,
        url: cosUrl
      }
    });

    return result;
  } catch (error) {
    // 错误处理逻辑
    return handleError(error, batch, task);
  }
}
```

## 五、部署配置

### 5.1 Redis配置

```bash
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### 5.2 n8n环境变量

```env
# n8n配置
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password

# Redis连接
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Google AI API
GOOGLE_AI_PROJECT_ID=your_project_id
GOOGLE_AI_LOCATION=us-central1

# OpenAI API (用于提示词生成)
OPENAI_API_KEY=sk-xxx

# 腾讯云COS
TENCENT_SECRET_ID=xxx
TENCENT_SECRET_KEY=xxx
TENCENT_COS_BUCKET=your-bucket
TENCENT_COS_REGION=ap-guangzhou

# 云函数回调地址
CLOUD_FUNCTION_CALLBACK_URL=https://your-cloudbase-url.com/photography/callback
```

### 5.3 API密钥初始化脚本

```javascript
// init-api-keys.js - 在Redis中初始化API密钥池
const Redis = require('redis');
const redis = Redis.createClient();

const API_KEYS = [
  { id: 'key1', key: 'AIzaSy...', weight: 10, maxConcurrent: 3 },
  { id: 'key2', key: 'AIzaSy...', weight: 10, maxConcurrent: 3 },
  { id: 'key3', key: 'AIzaSy...', weight: 10, maxConcurrent: 3 },
  { id: 'key4', key: 'AIzaSy...', weight: 8, maxConcurrent: 2 }  // 备用密钥
];

async function initKeys() {
  await redis.del('api_keys:google:available');

  for (const key of API_KEYS) {
    const keyData = {
      ...key,
      currentUsage: 0,
      rateLimitUntil: null,
      errorCount: 0,
      lastUsed: null
    };
    await redis.lpush('api_keys:google:available', JSON.stringify(keyData));
  }

  console.log('API keys initialized successfully');
  await redis.quit();
}

initKeys();
```

## 六、性能优化

### 6.1 缓存策略

```javascript
// 相同提示词缓存（避免重复生成）
const promptHash = crypto.createHash('md5').update(finalPrompt).digest('hex');
const cachedResult = await $redis.get(`prompt_cache:${promptHash}`);

if (cachedResult) {
  return { json: { fromCache: true, result: JSON.parse(cachedResult) } };
}

// 生成后缓存（TTL: 7天）
await $redis.setex(`prompt_cache:${promptHash}`, 604800, JSON.stringify(result));
```

### 6.2 监控指标

```javascript
// 收集性能指标
const metrics = {
  taskId: task.taskId,
  queueWaitTime: task.processingStartedAt - task.createdAt,
  promptGenerationTime: task.promptGeneratedAt - task.processingStartedAt,
  imageGenerationTime: task.imagesGeneratedAt - task.promptGeneratedAt,
  uploadTime: task.uploadCompletedAt - task.imagesGeneratedAt,
  totalTime: task.uploadCompletedAt - task.createdAt,
  retryCount: task.retryCount,
  apiKeysUsed: task.apiKeysUsed.length
};

// 写入时序数据库或日志
await logMetrics(metrics);
```

## 七、故障处理

### 7.1 Worker崩溃恢复

```javascript
// Worker启动时检查processing队列
async function recoverUnfinishedTasks() {
  const processingTasks = await $redis.smembers('task_queue:photography:processing');

  for (const taskId of processingTasks) {
    const task = await $redis.hget(`task_status:${taskId}`, 'data');
    if (task) {
      const taskData = JSON.parse(task);
      const timeSinceUpdate = Date.now() - new Date(taskData.updatedAt).getTime();

      // 超过5分钟没更新，认为任务失败，重新入队
      if (timeSinceUpdate > 300000) {
        taskData.status = 'pending';
        taskData.retryCount++;
        await $redis.lpush('task_queue:photography:pending', JSON.stringify(taskData));
        await $redis.srem('task_queue:photography:processing', taskId);
      }
    }
  }
}
```

### 7.2 API密钥自动恢复

```javascript
// 定期检查rate limit密钥是否可恢复
setInterval(async () => {
  const rateLimitKeys = await $redis.smembers('api_keys:google:rate_limit');

  for (const keyId of rateLimitKeys) {
    const ttl = await $redis.ttl(`api_keys:google:rate_limit:${keyId}`);
    if (ttl <= 0) {
      // TTL过期，恢复密钥
      await $redis.srem('api_keys:google:rate_limit', keyId);
      console.log(`API key ${keyId} recovered from rate limit`);
    }
  }
}, 10000); // 每10秒检查一次
```

## 八、测试方案

### 8.1 单元测试

- 测试API密钥选择算法
- 测试错误码分类逻辑
- 测试提示词合成正确性
- 测试Base64转换

### 8.2 集成测试

- 测试完整工作流（单图生成）
- 测试套图并发生成（9张）
- 测试错误重试机制
- 测试API密钥切换

### 8.3 压力测试

- 并发100个任务测试队列处理能力
- 测试API密钥池耗尽场景
- 测试Redis连接断开恢复
- 测试Worker多实例负载均衡

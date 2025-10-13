# n8n并发性能优化方案

## 一、并发能力分析

### 1.1 资源限制

**硬件资源：**
- CPU: 4核
- RAM: 4GB
- API密钥: 3个 (每个支持3并发)

**理论最大并发：**
- **API层面**：3个密钥 × 3并发 = **9个并发AI生成请求**
- **服务器层面**：4核CPU，建议运行 **3-5个Worker实例**

### 1.2 不同场景的并发能力

| 场景模式 | 单个任务占用槽位 | 理论最大并发用户 | 实际推荐并发 | 平均响应时间 |
|---------|----------------|----------------|-------------|------------|
| 单图模式 (count=1) | 1个槽位 | 9个用户 | 6-8个用户 | 30-60秒 |
| 小套图 (count=3) | 3个槽位 | 3个用户 | 2-3个用户 | 60-90秒 |
| 大套图 (count=9) | 9个槽位 | 1个用户 | 1个用户 | 90-120秒 |
| 混合模式 | 动态分配 | 3-5个用户 | 2-4个用户 | 60-120秒 |

### 1.3 当前架构问题

```
❌ 问题：单Worker串行处理

用户A提交 (套图9张) → Worker处理90秒 → 完成
用户B提交 (等待90秒)   ↓
用户C提交 (等待180秒)  ↓
用户D提交 (等待270秒)  ↓

结果：API密钥大量空闲，用户等待时间过长
```

## 二、优化方案

### 2.1 方案一：多Worker并发处理（推荐）

**架构改进：**

```
            Redis队列
               ↓
    ┌──────────┼──────────┐
    ↓          ↓          ↓
 Worker1    Worker2    Worker3
 (每10秒)   (每10秒)   (每10秒)
    ↓          ↓          ↓
  API密钥池 (动态分配9个槽位)
    ↓          ↓          ↓
  Google AI API (并发调用)
```

**并发提升：**
- 3个Worker可以同时从队列取任务
- **每分钟可处理：3个套图任务或15-20个单图任务**
- 队列等待时间降低到原来的1/3

**部署配置：**

```yaml
# docker-compose.yml
services:
  n8n:
    # ... 原配置保持不变

  n8n-worker-1:
    image: n8nio/n8n:latest
    container_name: n8n-worker-1
    restart: always
    environment:
      - N8N_PROTOCOL=http
      - N8N_HOST=n8n
      - EXECUTIONS_PROCESS=main
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      # 其他环境变量同主实例
    volumes:
      - n8n_data:/home/node/.n8n:ro
    depends_on:
      - redis
      - n8n
    networks:
      - n8n-network

  n8n-worker-2:
    image: n8nio/n8n:latest
    container_name: n8n-worker-2
    restart: always
    environment:
      - N8N_PROTOCOL=http
      - N8N_HOST=n8n
      - EXECUTIONS_PROCESS=main
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - n8n_data:/home/node/.n8n:ro
    depends_on:
      - redis
      - n8n
    networks:
      - n8n-network

  n8n-worker-3:
    image: n8nio/n8n:latest
    container_name: n8n-worker-3
    restart: always
    environment:
      - N8N_PROTOCOL=http
      - N8N_HOST=n8n
      - EXECUTIONS_PROCESS=main
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - n8n_data:/home/node/.n8n:ro
    depends_on:
      - redis
      - n8n
    networks:
      - n8n-network
```

### 2.2 方案二：智能并发控制（最优方案）

**改进Worker工作流的并发逻辑：**

不是每次只取1个任务，而是根据可用API密钥动态批量取任务：

```javascript
// 改进的"从队列获取任务"节点
const redis = $redis;

// 1. 检查当前可用API槽位
const availableKeys = await redis.lRange('api_keys:google:available', 0, -1);
const busyKeys = await redis.sMembers('api_keys:google:busy');
const rateLimitKeys = await redis.sMembers('api_keys:google:rate_limit');

const usableKeys = availableKeys
  .filter(k => !busyKeys.includes(k) && !rateLimitKeys.includes(k))
  .map(k => JSON.parse(k));

// 计算可用槽位总数
const totalSlots = usableKeys.reduce((sum, key) => {
  return sum + (key.maxConcurrent - key.currentUsage);
}, 0);

console.log(`当前可用槽位数: ${totalSlots}`);

if (totalSlots === 0) {
  return { json: { noSlots: true } };
}

// 2. 从队列中批量获取任务（智能数量）
// 预估每个任务需要的槽位（默认假设平均5个）
const estimatedSlotsPerTask = 5;
const maxTasks = Math.max(1, Math.floor(totalSlots / estimatedSlotsPerTask));

const tasks = [];
for (let i = 0; i < maxTasks; i++) {
  const task = await redis.rPop('task_queue:photography:pending');
  if (!task) break;

  const taskObj = JSON.parse(task);
  tasks.push(taskObj);

  // 累计已占用的槽位
  const slotsNeeded = taskObj.params.count;
  if (slotsNeeded >= totalSlots) break; // 避免过度取任务
}

console.log(`本次批量获取 ${tasks.length} 个任务`);

return tasks.map(task => ({ json: task }));
```

**性能提升：**

| 指标 | 优化前 | 优化后 | 提升 |
|-----|-------|-------|------|
| 每分钟处理任务数 | 0.67个 | 3-6个 | **5-9倍** |
| API密钥利用率 | 11% | 70-90% | **6-8倍** |
| 10用户排队等待 | 13.5分钟 | 3-5分钟 | **减少70%** |
| 最大同时服务用户 | 1人 | 6-9人 | **6-9倍** |

### 2.3 方案三：增加API密钥（扩展性方案）

**如果需要支持更多并发用户：**

```javascript
// 增加到10个API密钥
const API_KEYS = [
  { id: 'key1', key: 'AIza...', weight: 10, maxConcurrent: 3 },
  { id: 'key2', key: 'AIza...', weight: 10, maxConcurrent: 3 },
  { id: 'key3', key: 'AIza...', weight: 10, maxConcurrent: 3 },
  { id: 'key4', key: 'AIza...', weight: 10, maxConcurrent: 3 },
  { id: 'key5', key: 'AIza...', weight: 10, maxConcurrent: 3 },
  { id: 'key6', key: 'AIza...', weight: 10, maxConcurrent: 3 },
  { id: 'key7', key: 'AIza...', weight: 10, maxConcurrent: 3 },
  { id: 'key8', key: 'AIza...', weight: 10, maxConcurrent: 3 },
  { id: 'key9', key: 'AIza...', weight: 10, maxConcurrent: 3 },
  { id: 'key10', key: 'AIza...', weight: 10, maxConcurrent: 3 }
];

// 理论最大并发：10 × 3 = 30个并发AI请求
// 可同时服务：20-25个用户（混合模式）
```

**成本分析：**

| API密钥数量 | 并发能力 | 月成本估算 | 适用场景 |
|-----------|---------|-----------|---------|
| 3个密钥 | 6-9用户 | ¥300-500 | 小规模测试 |
| 5个密钥 | 10-15用户 | ¥500-800 | 中小型运营 |
| 10个密钥 | 20-25用户 | ¥1000-1500 | 规模化运营 |
| 20个密钥 | 40-50用户 | ¥2000-3000 | 大规模商用 |

## 三、队列优先级策略

### 3.1 VIP用户优先

```javascript
// 使用Redis的多个队列实现优先级
const queues = {
  vip: 'task_queue:photography:vip',      // VIP用户
  normal: 'task_queue:photography:normal', // 普通用户
  batch: 'task_queue:photography:batch'    // 批量任务
};

// Worker按优先级消费
async function getNextTask() {
  // 先从VIP队列取
  let task = await redis.rPop(queues.vip);
  if (task) return { json: JSON.parse(task), priority: 'vip' };

  // 再从普通队列取
  task = await redis.rPop(queues.normal);
  if (task) return { json: JSON.parse(task), priority: 'normal' };

  // 最后从批量队列取
  task = await redis.rPop(queues.batch);
  if (task) return { json: JSON.parse(task), priority: 'batch' };

  return null;
}
```

### 3.2 任务类型优化

```javascript
// 单图任务优先（快速完成，提升用户体验）
if (availableSlots < 3) {
  // 槽位不足时，只取单图任务
  const task = await redis.lRange('task_queue:photography:pending', 0, -1);
  const singleImageTasks = task.filter(t => {
    const obj = JSON.parse(t);
    return obj.params.count === 1;
  });

  if (singleImageTasks.length > 0) {
    await redis.lRem('task_queue:photography:pending', 1, singleImageTasks[0]);
    return { json: JSON.parse(singleImageTasks[0]) };
  }
}
```

## 四、用户体验优化

### 4.1 排队位置提示

在入口工作流返回队列位置：

```javascript
// 入口工作流 - 生成任务对象节点
const queueLength = await $redis.lLen('task_queue:photography:pending');
const processingCount = await $redis.sCard('task_queue:photography:processing');

// 估算等待时间
const avgTaskTime = 90; // 秒
const estimatedWaitTime = Math.ceil((queueLength * avgTaskTime) / 3); // 3个Worker

return {
  json: {
    ...task,
    queueInfo: {
      position: queueLength + 1,
      estimatedWaitSeconds: estimatedWaitTime,
      processingCount: processingCount
    }
  }
};
```

返回给前端：

```json
{
  "success": true,
  "taskId": "task_xxx",
  "queueInfo": {
    "position": 5,
    "estimatedWaitSeconds": 150,
    "processingCount": 3
  },
  "message": "您前面还有5个任务，预计等待2.5分钟"
}
```

### 4.2 限流保护

防止单用户恶意刷任务：

```javascript
// 检查用户的进行中任务数
const userTasks = await $redis.keys(`task_status:task_*`);
let userPendingCount = 0;

for (const key of userTasks) {
  const taskData = await $redis.hGet(key, 'data');
  const task = JSON.parse(taskData);
  if (task.userId === userId && ['pending', 'processing'].includes(task.status)) {
    userPendingCount++;
  }
}

// 限制：每个用户最多3个待处理任务
if (userPendingCount >= 3) {
  return {
    success: false,
    message: '您有太多任务正在处理中，请稍后再试',
    currentTasks: userPendingCount
  };
}
```

### 4.3 紧急任务快速通道

对于付费用户或特殊场景：

```javascript
// 使用LPUSH插入队列头部（紧急任务）
if (user.isPremium || event.urgent) {
  await redis.lPush('task_queue:photography:vip', JSON.stringify(task));
} else {
  await redis.rPush('task_queue:photography:normal', JSON.stringify(task));
}
```

## 五、监控和告警

### 5.1 实时监控指标

```javascript
// 监控脚本 monitor-realtime.js
const metrics = {
  // 队列指标
  pendingTasks: await redis.lLen('task_queue:photography:pending'),
  processingTasks: await redis.sCard('task_queue:photography:processing'),
  failedTasks: await redis.lLen('task_queue:photography:failed'),

  // API密钥指标
  availableKeys: await redis.lLen('api_keys:google:available'),
  busyKeys: await redis.sCard('api_keys:google:busy'),
  rateLimitKeys: await redis.sCard('api_keys:google:rate_limit'),

  // 计算利用率
  keyUtilization: (busyKeys / (availableKeys + busyKeys)) * 100,

  // 估算处理能力
  estimatedThroughput: Math.floor(60 / 90 * 3), // 每分钟完成任务数

  timestamp: new Date().toISOString()
};

console.log(JSON.stringify(metrics, null, 2));
```

### 5.2 告警规则

```javascript
// 告警阈值
const ALERT_THRESHOLDS = {
  queueLength: 50,        // 队列长度超过50
  waitTime: 600,          // 等待时间超过10分钟
  failedRate: 0.1,        // 失败率超过10%
  keyUtilization: 0.95    // 密钥利用率超过95%
};

// 发送告警
if (metrics.pendingTasks > ALERT_THRESHOLDS.queueLength) {
  sendAlert({
    level: 'warning',
    message: `队列积压严重: ${metrics.pendingTasks}个任务等待处理`,
    suggestion: '建议增加Worker实例或API密钥'
  });
}
```

## 六、压力测试方案

### 6.1 模拟并发用户

```javascript
// test-concurrency.js
const axios = require('axios');

const WEBHOOK_URL = 'http://your-server:5678/webhook/photography/generate';
const CONCURRENT_USERS = 20;

async function simulateUser(userId) {
  const startTime = Date.now();

  try {
    const response = await axios.post(WEBHOOK_URL, {
      userId: `test_user_${userId}`,
      mode: 'photo_set',
      images: ['https://example.com/test.jpg'],
      params: {
        scene: '商业摄影',
        style: '现代简约',
        count: 9
      }
    });

    console.log(`用户${userId}: 任务已提交, taskId=${response.data.taskId}, 排队位置=${response.data.queueInfo.position}`);

    // 轮询任务状态
    const taskId = response.data.taskId;
    let completed = false;

    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const status = await checkTaskStatus(taskId);
      if (status.status === 'completed') {
        const totalTime = Date.now() - startTime;
        console.log(`用户${userId}: 任务完成, 总耗时=${totalTime}ms`);
        completed = true;
      } else if (status.status === 'failed') {
        console.log(`用户${userId}: 任务失败`);
        completed = true;
      }
    }
  } catch (error) {
    console.error(`用户${userId}: 错误`, error.message);
  }
}

// 并发启动
async function runTest() {
  const users = Array.from({ length: CONCURRENT_USERS }, (_, i) => i + 1);
  await Promise.all(users.map(userId => simulateUser(userId)));
}

runTest();
```

### 6.2 性能基准测试结果

**预期性能指标（优化后）：**

| 并发用户数 | 平均响应时间 | P95响应时间 | P99响应时间 | 成功率 |
|----------|------------|-----------|-----------|-------|
| 5用户 | 90秒 | 120秒 | 150秒 | 99.5% |
| 10用户 | 180秒 | 240秒 | 300秒 | 99% |
| 20用户 | 360秒 | 480秒 | 600秒 | 98% |
| 50用户 | 900秒 | 1200秒 | 1500秒 | 95% |

## 七、成本优化建议

### 7.1 分时段调整资源

```javascript
// 根据时段动态调整Worker数量
const schedule = {
  peak: {      // 高峰期 (12:00-14:00, 19:00-23:00)
    workers: 5,
    apiKeys: 10
  },
  normal: {    // 平时
    workers: 3,
    apiKeys: 5
  },
  night: {     // 夜间 (00:00-07:00)
    workers: 1,
    apiKeys: 3
  }
};
```

### 7.2 智能降级策略

```javascript
// 当队列长度过长时，自动降低套图数量
if (queueLength > 30) {
  if (task.params.count > 6) {
    task.params.count = 6; // 降低到6张
    task.degraded = true;
  }
}
```

## 八、推荐部署配置

### 基础配置（初期）

- **Worker实例**: 3个
- **API密钥**: 3-5个
- **并发能力**: 6-10个用户
- **月成本**: ¥500-800

### 标准配置（运营期）

- **Worker实例**: 5个
- **API密钥**: 10个
- **并发能力**: 20-25个用户
- **月成本**: ¥1000-1500

### 高级配置（规模化）

- **Worker实例**: 10个
- **API密钥**: 20个
- **并发能力**: 40-50个用户
- **月成本**: ¥2000-3000
- **额外建议**: 升级服务器到8核8GB

---

## 总结

当前架构在优化后的并发能力：

✅ **3个Worker + 3个API密钥**: 6-9个用户同时使用
✅ **5个Worker + 5个API密钥**: 10-15个用户同时使用
✅ **10个Worker + 10个API密钥**: 20-25个用户同时使用

推荐从**方案二（智能并发控制）**开始实施，成本最低，效果最好！

# n8n工作流部署配置指南

## 一、服务器环境准备

### 1.1 系统要求

- **服务器配置**: 4核CPU, 4GB RAM (已满足)
- **操作系统**: Ubuntu 20.04+ / CentOS 7+
- **Docker版本**: 20.10+
- **Docker Compose**: 1.29+

### 1.2 安装Docker和Docker Compose

```bash
# 安装Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 二、Docker部署配置

### 2.1 创建docker-compose.yml

在服务器上创建 `/opt/n8n/docker-compose.yml`：

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      # 基础配置
      - N8N_PROTOCOL=http
      - N8N_HOST=your-domain.com
      - N8N_PORT=5678
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your_secure_password_here

      # 工作流配置
      - EXECUTIONS_PROCESS=main
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379

      # Redis连接
      - REDIS_HOST=redis
      - REDIS_PORT=6379

      # Google AI API配置
      - GOOGLE_AI_PROJECT_ID=your-google-project-id
      - GOOGLE_AI_LOCATION=us-central1

      # OpenAI API (用于提示词生成)
      - OPENAI_API_KEY=sk-your-openai-api-key

      # 腾讯云COS配置
      - TENCENT_SECRET_ID=your-tencent-secret-id
      - TENCENT_SECRET_KEY=your-tencent-secret-key
      - TENCENT_COS_BUCKET=your-bucket-name
      - TENCENT_COS_REGION=ap-guangzhou
      - TENCENT_COS_UPLOAD_URL=https://your-bucket.cos.ap-guangzhou.myqcloud.com

      # 云函数回调地址
      - CLOUD_FUNCTION_CALLBACK_URL=https://your-cloudbase-env.service.tcloudbase.com

      # Worker Webhook地址
      - N8N_WORKER_WEBHOOK_URL=http://n8n:5678

      # 时区
      - TZ=Asia/Shanghai

    volumes:
      - n8n_data:/home/node/.n8n
      - ./workflows:/home/node/.n8n/workflows
    depends_on:
      - redis
    networks:
      - n8n-network

  redis:
    image: redis:7-alpine
    container_name: redis
    restart: always
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - n8n-network

volumes:
  n8n_data:
    driver: local
  redis_data:
    driver: local

networks:
  n8n-network:
    driver: bridge
```

### 2.2 启动服务

```bash
cd /opt/n8n
sudo docker-compose up -d

# 查看日志
sudo docker-compose logs -f n8n
```

## 三、导入工作流

### 3.1 上传工作流文件

将以下工作流JSON文件上传到服务器 `/opt/n8n/workflows/` 目录：

```bash
# 在本地项目目录
scp n8n-workflows/*.json user@your-server:/opt/n8n/workflows/
```

### 3.2 在n8n界面中导入

1. 访问 `http://your-server:5678`
2. 使用配置的用户名密码登录
3. 点击右上角菜单 → "Import from File"
4. 依次导入三个工作流：
   - `prompt-composition-workflow.json` (先导入此工作流)
   - `photography-entry-workflow.json`
   - `photography-worker-workflow.json`

### 3.3 记录工作流ID

导入提示词合成工作流后，获取其workflow ID，更新到Worker工作流的环境变量中：

```yaml
# 在docker-compose.yml中添加
- PROMPT_COMPOSITION_WORKFLOW_ID=workflow_id_here
```

## 四、配置凭据

### 4.1 Redis凭据

在n8n界面中：
1. 进入 "Credentials" → "New"
2. 选择 "Redis"
3. 配置：
   - Name: `Redis Main`
   - Host: `redis`
   - Port: `6379`
   - Database: `0`

### 4.2 Google AI凭据

1. 在Google Cloud Console创建服务账号
2. 下载JSON密钥文件
3. 在n8n中创建 "Google Service Account" 凭据
4. 上传JSON密钥文件
5. Name: `Google AI API`

### 4.3 OpenAI凭据

1. 创建 "OpenAI" 凭据
2. 填入API Key
3. Name: `OpenAI API`

### 4.4 腾讯云凭据

1. 创建自定义HTTP凭据用于COS上传
2. 或者使用Code节点直接处理签名

## 五、初始化API密钥池

### 5.1 创建初始化脚本

在服务器上创建 `/opt/n8n/init-api-keys.js`：

```javascript
const Redis = require('redis');

const API_KEYS = [
  {
    id: 'key1',
    key: 'AIzaSy...your-key-1',
    weight: 10,
    maxConcurrent: 3,
    currentUsage: 0,
    rateLimitUntil: null,
    errorCount: 0,
    lastUsed: null
  },
  {
    id: 'key2',
    key: 'AIzaSy...your-key-2',
    weight: 10,
    maxConcurrent: 3,
    currentUsage: 0,
    rateLimitUntil: null,
    errorCount: 0,
    lastUsed: null
  },
  {
    id: 'key3',
    key: 'AIzaSy...your-key-3',
    weight: 10,
    maxConcurrent: 3,
    currentUsage: 0,
    rateLimitUntil: null,
    errorCount: 0,
    lastUsed: null
  }
];

async function initKeys() {
  const redis = Redis.createClient({
    url: 'redis://localhost:6379'
  });

  await redis.connect();

  // 清空现有密钥
  await redis.del('api_keys:google:available');
  await redis.del('api_keys:google:busy');
  await redis.del('api_keys:google:rate_limit');

  // 添加所有密钥
  for (const key of API_KEYS) {
    await redis.lPush('api_keys:google:available', JSON.stringify(key));
  }

  console.log(`成功初始化${API_KEYS.length}个API密钥`);

  await redis.quit();
}

initKeys().catch(console.error);
```

### 5.2 运行初始化脚本

```bash
# 安装Node.js (如果尚未安装)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装redis客户端
cd /opt/n8n
npm install redis

# 运行初始化脚本
node init-api-keys.js
```

### 5.3 验证密钥已初始化

```bash
# 连接到Redis容器
docker exec -it redis redis-cli

# 查看密钥列表
LRANGE api_keys:google:available 0 -1
```

## 六、激活工作流

### 6.1 激活Worker工作流

1. 在n8n界面打开 "AI摄影-Worker处理工作流"
2. 点击右上角 "Active" 开关激活
3. 确认定时触发器正常工作

### 6.2 获取Webhook URL

1. 打开 "AI摄影-入口工作流"
2. 点击Webhook节点
3. 复制生产环境URL，格式如：
   ```
   http://your-server:5678/webhook/photography/generate
   ```

### 6.3 配置云函数

在微信云开发的 `photography` 云函数中配置n8n webhook地址：

```javascript
// cloudfunctions/photography/index.js

const N8N_WEBHOOK_URL = 'http://your-server:5678/webhook/photography/generate';

exports.main = async (event, context) => {
  const { action } = event;

  if (action === 'generate') {
    // 调用n8n工作流
    const response = await uniCloud.httpclient.request(N8N_WEBHOOK_URL, {
      method: 'POST',
      data: {
        userId: context.OPENID,
        mode: event.mode || 'normal',
        images: event.images,
        params: event.params,
        prompt: event.prompt
      },
      dataType: 'json'
    });

    return response.data;
  }

  // ... 其他action处理
};
```

## 七、监控和维护

### 7.1 查看工作流执行日志

```bash
# n8n日志
docker logs -f n8n

# Redis日志
docker logs -f redis
```

### 7.2 监控Redis队列

创建监控脚本 `/opt/n8n/monitor-queue.sh`：

```bash
#!/bin/bash

echo "=== Redis队列监控 ==="
echo ""

echo "待处理任务数:"
docker exec redis redis-cli LLEN task_queue:photography:pending

echo ""
echo "处理中任务数:"
docker exec redis redis-cli SCARD task_queue:photography:processing

echo ""
echo "失败任务数:"
docker exec redis redis-cli LLEN task_queue:photography:failed

echo ""
echo "可用API密钥数:"
docker exec redis redis-cli LLEN api_keys:google:available

echo ""
echo "使用中API密钥数:"
docker exec redis redis-cli SCARD api_keys:google:busy

echo ""
echo "限流中API密钥数:"
docker exec redis redis-cli SCARD api_keys:google:rate_limit
```

```bash
chmod +x /opt/n8n/monitor-queue.sh
./monitor-queue.sh
```

### 7.3 设置定时任务检查队列

```bash
# 添加crontab任务
crontab -e

# 每5分钟检查一次队列状态
*/5 * * * * /opt/n8n/monitor-queue.sh >> /var/log/n8n-queue.log 2>&1
```

### 7.4 处理失败任务

创建重试脚本 `/opt/n8n/retry-failed.sh`：

```bash
#!/bin/bash

# 将失败队列的任务移回待处理队列
while true; do
  task=$(docker exec redis redis-cli RPOP task_queue:photography:failed)

  if [ -z "$task" ]; then
    echo "没有失败任务需要重试"
    break
  fi

  echo "重试任务: $task"
  docker exec redis redis-cli LPUSH task_queue:photography:pending "$task"
done

echo "失败任务重试完成"
```

## 八、性能优化

### 8.1 调整Redis内存

如果任务量大，增加Redis内存限制：

```yaml
# docker-compose.yml
command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### 8.2 增加Worker并发

部署多个Worker实例处理任务：

```bash
# 复制Worker工作流
# 在n8n界面中复制工作流并激活
# 每个Worker独立轮询队列，自动实现负载均衡
```

### 8.3 启用n8n队列模式

在 `docker-compose.yml` 中已启用队列模式，可处理更多并发任务。

## 九、安全配置

### 9.1 使用HTTPS

配置Nginx反向代理：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

更新 `docker-compose.yml`:

```yaml
- N8N_PROTOCOL=https
- N8N_HOST=your-domain.com
```

### 9.2 API密钥安全

- 使用环境变量存储密钥
- 定期轮换API密钥
- 限制n8n访问IP白名单

### 9.3 Redis密码保护

```yaml
# docker-compose.yml
redis:
  command: redis-server --requirepass your_redis_password --appendonly yes

n8n:
  environment:
    - REDIS_PASSWORD=your_redis_password
```

## 十、故障排查

### 10.1 工作流无法触发

```bash
# 检查n8n是否正常运行
docker ps | grep n8n

# 检查webhook是否可访问
curl -X POST http://localhost:5678/webhook/photography/generate \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 10.2 Redis连接失败

```bash
# 检查Redis是否运行
docker ps | grep redis

# 测试Redis连接
docker exec redis redis-cli ping
```

### 10.3 API调用失败

- 检查Google AI API配额
- 验证API密钥是否正确
- 查看n8n执行日志中的错误信息

## 十一、备份策略

### 11.1 备份Redis数据

```bash
# 创建备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec redis redis-cli BGSAVE
docker cp redis:/data/dump.rdb /backup/redis_${DATE}.rdb
```

### 11.2 备份n8n工作流

n8n的工作流存储在 `/home/node/.n8n` 卷中，定期备份：

```bash
docker run --rm -v n8n_data:/data -v /backup:/backup alpine \
  tar czf /backup/n8n_$(date +%Y%m%d).tar.gz /data
```

## 十二、升级维护

### 12.1 升级n8n

```bash
cd /opt/n8n
docker-compose pull
docker-compose up -d
```

### 12.2 清理旧数据

定期清理Redis中的旧任务记录：

```bash
# 清理30天前的任务状态
docker exec redis redis-cli --scan --pattern "task_status:*" | \
  xargs docker exec redis redis-cli DEL
```

---

## 快速启动检查清单

- [ ] Docker和Docker Compose已安装
- [ ] docker-compose.yml配置完成
- [ ] 所有环境变量已填写
- [ ] Redis服务正常运行
- [ ] n8n服务正常运行
- [ ] 三个工作流已导入
- [ ] 所有凭据已配置
- [ ] API密钥池已初始化
- [ ] Worker工作流已激活
- [ ] Webhook URL已配置到云函数
- [ ] 监控脚本已部署
- [ ] 备份策略已设置

完成以上检查后，系统即可投入使用！

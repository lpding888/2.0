# AI摄影队列处理器 - n8n Workflow

## 功能说明

这个n8n workflow解决了微信云函数60秒超时限制的问题，将AI图片生成（120秒+）转移到NAS上处理。

### 主要功能

1. **队列轮询**：每30秒检查一次待处理任务
2. **图片下载**：从云存储下载用户上传的服装图片
3. **背景移除**（可选）：使用Rembg提升图片质量
4. **AI生成**：调用Gemini API生成图片（无超时限制）
5. **结果上传**：上传到云存储
6. **状态回调**：通知云函数更新任务状态

### 图片质量提升方案

#### 方案1：Rembg（推荐，开源免费）

**优势**：
- 完全开源免费
- 可以在NAS Docker中部署
- 性能优秀，支持多种模型
- API简单易用

**部署方式**：
```bash
# 在NAS上运行Rembg HTTP服务
docker run -p 7000:7000 danielgatis/rembg s --host 0.0.0.0 --port 7000
```

**配置**：
- 在n8n环境变量中设置 `REMBG_HOST=localhost`（或NAS内网IP）
- 设置 `ENABLE_BG_REMOVAL=true` 启用背景移除

#### 方案2：rembg.com API（备选，免费）

如果不想自己部署，可以使用在线API：
```bash
# 修改workflow中的URL为：
https://www.rembg.com/api/remove
```

#### 方案3：remove.bg API（商业）

每月50张免费，超出后收费：
- 注册获取API Key: https://www.remove.bg/api
- 在workflow中添加API Key认证

## 环境变量配置

在n8n中配置以下环境变量：

```bash
# 云函数URL（你的微信云开发环境）
CLOUD_FUNCTION_URL=https://your-cloud-env.com

# NAS密钥（用于认证）
NAS_SECRET_KEY=your-secret-key-here

# Gemini API密钥
GEMINI_API_KEY=your-gemini-api-key

# Rembg服务地址（如果启用背景移除）
REMBG_HOST=localhost

# 是否启用背景移除
ENABLE_BG_REMOVAL=true
```

## 部署步骤

### 1. 在NAS上部署Rembg（可选）

```bash
# 使用Docker Compose部署
cd /path/to/your/docker
nano docker-compose.yml
```

添加以下内容：
```yaml
version: '3.8'

services:
  rembg:
    image: danielgatis/rembg
    container_name: rembg
    ports:
      - "7000:7000"
    command: s --host 0.0.0.0 --port 7000
    restart: unless-stopped
```

启动服务：
```bash
docker-compose up -d rembg
```

### 2. 导入n8n Workflow

1. 登录你的n8n实例
2. 点击 "Import from File"
3. 选择 `ai-photography-queue-processor.json`
4. 配置环境变量（Settings → Variables）
5. 激活workflow

### 3. 部署云函数API

需要在 `cloudfunctions/api/index.js` 中添加以下action：

- `getPendingTasks`：获取待处理任务
- `getTempFileURLs`：获取临时文件URL
- `uploadGeneratedImage`：上传生成的图片
- `nasCallback`：接收NAS回调

详见下一步的云函数实现。

## 工作流程

```
用户发起请求
    ↓
云函数创建任务 (status=pending)
    ↓
n8n每30秒轮询 (getPendingTasks)
    ↓
下载用户上传的图片
    ↓
[可选] Rembg背景移除
    ↓
调用Gemini AI生成 (180秒超时)
    ↓
上传生成结果到云存储
    ↓
回调云函数 (nasCallback)
    ↓
更新任务状态 (status=completed)
    ↓
用户收到结果通知
```

## 性能优化

### 并发控制

默认配置：
- 每30秒处理1个任务
- 每个任务串行处理（下载→AI生成→上传）

如果NAS性能足够，可以：
1. 修改 `splitInBatches` 的 `batchSize` 增加并发
2. 减少轮询间隔（但要注意云函数调用频率限制）

### AI超时配置

当前配置：
- Gemini API: 180秒超时（180000ms）
- 可以根据实际情况调整

### 背景移除性能

Rembg处理时间：
- 单张图片约5-10秒
- 如果不需要可以设置 `ENABLE_BG_REMOVAL=false`

## 监控和日志

### n8n内置监控

- 查看执行历史：Executions → Past Executions
- 查看错误日志：点击失败的执行查看详情

### 云函数日志

在微信云开发控制台查看：
- 云函数 → api → 日志

### Rembg日志

```bash
docker logs rembg
```

## 故障排查

### 问题1：n8n无法获取任务

**检查**：
- 环境变量 `CLOUD_FUNCTION_URL` 是否正确
- NAS是否能访问云函数URL
- `NAS_SECRET_KEY` 是否匹配

### 问题2：Rembg背景移除失败

**检查**：
- Rembg服务是否启动：`docker ps | grep rembg`
- 端口是否正确：`curl http://localhost:7000`
- 如果不需要，设置 `ENABLE_BG_REMOVAL=false`

### 问题3：Gemini API调用失败

**检查**：
- API Key是否有效
- 是否超出配额
- 网络是否能访问Google API

### 问题4：任务一直处于pending状态

**检查**：
- n8n workflow是否已激活
- n8n是否正常运行
- 查看n8n执行日志

## 成本分析

### 当前方案（云函数）
- 云函数调用：免费额度内
- 云存储：100-300元/月
- 失败率高（超时）

### 新方案（NAS + n8n）
- NAS电费：约30元/月
- Rembg：开源免费
- n8n：开源免费
- Gemini API：免费额度内
- 成功率高（无超时限制）

**节省：70-270元/月**

## 未来优化方向

1. **图片存储迁移到NAS**：进一步降低成本
2. **本地AI模型**：使用Stable Diffusion等本地模型
3. **批量处理**：一次处理多个任务
4. **智能重试**：失败任务自动重试
5. **质量检测**：生成后自动质量检测

## 技术支持

如有问题，请查看：
- n8n文档：https://docs.n8n.io/
- Rembg文档：https://github.com/danielgatis/rembg
- Gemini API文档：https://ai.google.dev/docs

# n8n 工作流配置

本目录包含AI摄影系统的n8n工作流配置文件。

## 📁 工作流文件

1. **fitting-batch.json** - AI试衣间批量生成工作流
2. **photography-batch.json** - AI摄影批量生成工作流
3. **notification.json** - 消息通知工作流

## 🚀 导入工作流

### 方式一：通过n8n Web界面导入

1. 访问n8n界面: `http://localhost:5678`
2. 点击左侧菜单 "Workflows"
3. 点击右上角 "Import from File"
4. 选择对应的JSON文件并导入

### 方式二：通过命令行导入

```bash
# 进入n8n容器（如果使用Docker）
docker exec -it n8n /bin/sh

# 或者直接使用n8n CLI
n8n import:workflow --input=/path/to/workflow.json
```

## ⚙️ 配置环境变量

在n8n中需要配置以下环境变量：

### 必需变量

```bash
# AI API配置
AI_API_URL=https://apis.kuai.host/v1beta/models/gemini-2.5-flash-image-preview:generateContent
AI_API_KEY=sk-RG8U9pINNX8KTWhZxxxyfPzwTRUfRtXYtmdscR5ePPkhS2vq

# 后端服务地址
BACKEND_URL=localhost:3000

# 内部通信密钥（可选，用于内部接口调用）
INTERNAL_SECRET=your-internal-secret-key
```

### 可选变量

```bash
# 邮件配置（用于通知工作流）
EMAIL_DOMAIN=example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-smtp-password
```

## 📋 工作流说明

### 1. fitting-batch.json - AI试衣间批量生成

**触发方式**: Webhook POST请求

**请求地址**: `http://localhost:5678/webhook/fitting-batch`

**请求体格式**:
```json
{
  "task_id": "uuid",
  "user_id": "user_id",
  "images": ["base64_image_1", "base64_image_2"],
  "prompt": "专业服装展示照片...",
  "parameters": {
    "temperature": 1.0,
    "topK": 40,
    "topP": 0.95
  },
  "batch_count": 5
}
```

**工作流程**:
1. 接收Webhook请求
2. 准备批处理数据（根据batch_count拆分）
3. 并行调用AI API生成图片
4. 解析AI响应，提取生成的图片
5. 合并所有批次的结果
6. 回调后端API更新任务状态
7. 返回响应给请求方

**错误处理**:
- AI API调用失败时，会触发错误回调
- 回调后端 `/api/callback/task-failed` 接口
- 返回500错误响应

### 2. photography-batch.json - AI摄影批量生成

**触发方式**: Webhook POST请求

**请求地址**: `http://localhost:5678/webhook/photography-batch`

**请求体格式**:
```json
{
  "task_id": "uuid",
  "user_id": "user_id",
  "type": "photography",
  "images": ["base64_image"],
  "prompt": "专业摄影作品...",
  "parameters": {
    "temperature": 1.0
  },
  "batch_count": 10,
  "destination": {
    "name": "埃菲尔铁塔",
    "country": "法国·巴黎",
    "prompt": "Eiffel Tower in Paris..."
  }
}
```

**特殊功能**:
- 支持旅行照片生成（type: "travel"）
- 自动合并目的地信息到prompt
- 提取AI生成的文字描述（摄影师说）
- 支持批量生成1-50张图片

**工作流程**:
1. 接收Webhook请求
2. 根据type构建完整prompt（旅行类型会添加目的地信息）
3. 准备批处理数据
4. 并行调用AI API
5. 解析响应，提取图片和文字描述
6. 合并结果
7. 回调后端更新任务状态
8. 返回响应

### 3. notification.json - 消息通知

**触发方式**: Webhook POST请求

**请求地址**: `http://localhost:5678/webhook/notification`

**请求体格式**:
```json
{
  "type": "websocket",
  "user_id": "user_id",
  "title": "任务完成通知",
  "content": "您的AI生成任务已完成",
  "data": {
    "task_id": "uuid",
    "images_count": 5
  }
}
```

**支持的通知类型**:
- `websocket` - WebSocket实时推送
- `email` - 邮件通知

**工作流程**:
1. 接收Webhook请求
2. 解析通知数据
3. 根据type选择通知方式
4. 发送通知（WebSocket或邮件）
5. 返回响应

## 🔧 配置API凭证

### 1. AI API Key

在n8n中添加HTTP Header Auth凭证：

1. 进入 Settings → Credentials
2. 点击 "New Credential"
3. 选择 "HTTP Header Auth"
4. 配置：
   - **Name**: AI API Key
   - **Credential for**: Custom
   - **Header Name**: Authorization
   - **Header Value**: `Bearer sk-YOUR-API-KEY-HERE`

### 2. SMTP配置（可选）

如果需要邮件通知功能：

1. 进入 Settings → Credentials
2. 点击 "New Credential"
3. 选择 "SMTP"
4. 配置SMTP服务器信息

## 📊 监控工作流

### 查看执行历史

1. 在n8n界面点击工作流
2. 点击 "Executions" 标签
3. 查看每次执行的详细信息

### 启用日志

```bash
# 在n8n环境变量中设置
N8N_LOG_LEVEL=debug
N8N_LOG_OUTPUT=console,file
```

## 🧪 测试工作流

### 使用cURL测试

**测试试衣间工作流**:
```bash
curl -X POST http://localhost:5678/webhook/fitting-batch \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "test-task-id",
    "user_id": "test-user",
    "images": ["base64_encoded_image"],
    "prompt": "professional fashion photography",
    "batch_count": 2
  }'
```

**测试摄影工作流**:
```bash
curl -X POST http://localhost:5678/webhook/photography-batch \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "test-task-id",
    "user_id": "test-user",
    "type": "photography",
    "images": [],
    "prompt": "professional portrait photography",
    "batch_count": 3
  }'
```

**测试通知工作流**:
```bash
curl -X POST http://localhost:5678/webhook/notification \
  -H "Content-Type: application/json" \
  -d '{
    "type": "websocket",
    "user_id": "test-user",
    "title": "测试通知",
    "content": "这是一条测试消息"
  }'
```

## 🔐 安全建议

1. **保护Webhook端点**:
   - 在生产环境中使用HTTPS
   - 添加API密钥验证
   - 限制IP白名单

2. **保护敏感数据**:
   - 不要在工作流中硬编码API Key
   - 使用n8n的Credentials功能
   - 定期轮换密钥

3. **监控和告警**:
   - 启用n8n的错误通知
   - 监控工作流执行失败率
   - 设置超时警告

## 🐛 故障排查

### 工作流无法触发

1. 检查Webhook URL是否正确
2. 检查n8n服务是否运行
3. 查看n8n日志: `docker logs n8n`

### AI API调用失败

1. 检查API Key是否正确配置
2. 检查API URL是否可访问
3. 检查请求体格式是否正确
4. 查看n8n执行日志中的错误详情

### 回调后端失败

1. 检查BACKEND_URL环境变量
2. 确认后端服务运行正常
3. 检查回调接口是否可访问
4. 查看后端日志

## 📚 更多资源

- [n8n官方文档](https://docs.n8n.io/)
- [n8n工作流示例](https://n8n.io/workflows)
- [AI API文档](https://docs.kuai.host/)

## 🤝 贡献

如果你有改进工作流的建议，欢迎提交PR！

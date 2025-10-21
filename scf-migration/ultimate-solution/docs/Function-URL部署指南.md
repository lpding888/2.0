# AI摄影师小程序 - Function URL部署指南

## 🚨 重要说明：API网关触发器已停用

腾讯云已于**2024年7月1日**停止新建API网关触发器，并将于**2025年6月30日**完全下线。

**替代方案：Function URL（Web函数类型）**

## 📋 当前配置状态

✅ **已完成配置修复**
- 使用Web函数类型（`type: web`）
- 自动启用Function URL
- 每个服务独立的HTTP端点
- 兼容现有HTTP请求格式

## 🏗️ 部署架构

### 函数结构
```
AI摄影师小程序 (8个Web函数)
├── api-gateway          → https://xxx.scf.tencentcloudapi.com
├── user-service         → https://xxx.scf.tencentcloudapi.com
├── ai-generation        → https://xxx.scf.tencentcloudapi.com
├── photography-service  → https://xxx.scf.tencentcloudapi.com
├── fitting-service      → https://xxx.scf.tencentcloudapi.com
├── scene-service        → https://xxx.scf.tencentcloudapi.com
├── prompt-service       → https://xxx.scf.tencentcloudapi.com
└── task-processor       → https://xxx.scf.tencentcloudapi.com
```

### 请求路由
**统一入口模式：**
- 所有请求 → `api-gateway` → 内部路由到对应服务

**独立服务模式：**
- 直接请求对应服务的Function URL

## 🚀 部署步骤

### 1. 环境准备
```bash
# 确认Serverless Framework版本
npx serverless --version
# 应显示: Framework Core: 3.40.0

# 配置腾讯云凭证
cat ~/.tencentcloud/credentials.ini
[default]
tencent_secret_id=YOUR_SECRET_ID
tencent_secret_key=YOUR_SECRET_KEY
tencent_app_id=YOUR_APP_ID
```

### 2. 环境变量配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**必需的环境变量：**
```env
# 数据库
MONGODB_URI=mongodb://localhost:27017/ai-photography
REDIS_URI=redis://localhost:6379

# 认证
JWT_SECRET=your-jwt-secret
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

# 腾讯云存储
COS_SECRET_ID=your-cos-secret-id
COS_SECRET_KEY=your-cos-secret-key
COS_BUCKET=your-bucket-name
COS_REGION=ap-guangzhou

# AI服务
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
SEEDREAM_API_KEY=your-seedream-key
DEEPSEEK_API_KEY=your-deepseek-key

# 业务模式
BUSINESS_MODE=hybrid
```

### 3. 部署函数
```bash
# 使用Function URL配置部署
npx serverless deploy --config serverless-function-url.yml
```

### 4. 验证部署
```bash
# 获取部署信息
npx serverless info --config serverless-function-url.yml

# 测试API网关函数
curl -X GET "https://your-api-gateway-url.scf.tencentcloudapi.com"

# 测试用户注册
curl -X POST "https://your-api-gateway-url.scf.tencentcloudapi.com" \
  -H "Content-Type: application/json" \
  -d '{"action":"user.register","openid":"test123","userInfo":{"nickname":"测试用户"}}'
```

## 📡 API调用方式

### 方式一：统一API网关（推荐）
所有请求通过api-gateway函数路由：

```javascript
// 小程序端调用示例
wx.request({
  url: 'https://api-gateway-url.scf.tencentcloudapi.com',
  method: 'POST',
  header: {
    'Content-Type': 'application/json'
  },
  data: {
    action: 'user.login',
    openid: 'user_openid',
    userInfo: { nickname: '用户昵称' }
  },
  success: (res) => {
    console.log('登录结果:', res.data)
  }
})
```

### 方式二：直接调用服务
直接请求对应的服务函数：

```javascript
// 直接调用用户服务
wx.request({
  url: 'https://user-service-url.scf.tencentcloudapi.com',
  method: 'POST',
  data: {
    action: 'login',
    openid: 'user_openid'
  }
})
```

## 🔧 Function URL优势

### 相比API网关触发器：
1. **更低延迟**：无需API网关转换，直接HTTP请求
2. **更低成本**：无API网关调用费用
3. **更简配置**：无需配置触发器
4. **更好性能**：支持WebSocket、流式传输

### Web函数特性：
- 直接接收HTTP请求（Request/Response）
- 支持标准HTTP方法（GET、POST、PUT等）
- 自动处理CORS
- 原生Web框架支持

## 📊 监控与日志

```bash
# 查看函数日志
npx serverless logs -f api-gateway

# 实时监控
# 腾讯云SCF控制台 → 函数管理 → 监控
```

## 🚨 注意事项

1. **无API网关限制**：Function URL没有API网关的流量控制、认证等功能
2. **HTTPS必需**：Function URL仅支持HTTPS协议
3. **域名限制**：需要自定义域名请单独配置
4. **并发限制**：注意SCF并发限制，必要时配置预留并发

## 🔗 相关文档

- [腾讯云SCF Function URL文档](https://cloud.tencent.com/document/product/583/96099)
- [Web函数开发指南](https://cloud.tencent.com/document/product/583/56123)
- [API网关迁移指引](https://cloud.tencent.com/document/product/583/107631)

---

## ✅ 部署检查清单

- [ ] Serverless Framework V3.40.0+
- [ ] 腾讯云凭证配置正确
- [ ] 环境变量配置完整
- [ ] 代码使用`exports.main_handler`入口
- [ ] 配置文件使用`type: web`
- [ ] 测试健康检查接口
- [ ] 测试用户注册接口
- [ ] 验证日志输出正常

**🎉 项目已准备好使用Function URL部署！**
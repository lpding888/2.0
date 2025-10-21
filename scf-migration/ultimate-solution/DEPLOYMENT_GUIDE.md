# 🚀 AI摄影师小程序 - 部署指南

> 📅 **最后更新**: 2024年10月20日
> 🎯 **目标**: 将微信云开发小程序成功迁移到腾讯云SCF

## 📋 前置条件

### 1. 腾讯云账号准备

你需要拥有以下腾讯云资源和权限：

1. **腾讯云账号**（已完成）
2. **API密钥**（需要获取）
   - Secret ID
   - Secret Key
   - APP ID

### 2. 获取腾讯云API密钥

1. 访问 [腾讯云访问管理控制台](https://console.cloud.tencent.com/cam/capi)
2. 点击"新建密钥"或使用现有密钥
3. 记录以下信息：
   - `SecretId`: 以 `AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 格式
   - `SecretKey`: 32位字符串
   - `APP ID`: 数字格式（如：1379020062）

### 3. 本地环境要求

- ✅ Node.js 18.15+ (已验证)
- ✅ Serverless Framework V3 (已安装)
- ✅ Git (已安装)

## 🔧 环境配置

### 步骤1: 配置腾讯云凭证

编辑文件：`C:\Users\qq100\.tencentcloud\credentials.ini`

```ini
[default]
tencent_secret_id=你的SecretId
tencent_secret_key=你的SecretKey
tencent_app_id=你的APPID
```

**示例**：
```ini
[default]
tencent_secret_id=AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
tencent_secret_key=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
tencent_app_id=1379020062
```

### 步骤2: 配置项目环境变量

编辑文件：`C:\Users\qq100\Desktop\迭代目录\2.0\scf-migration\ultimate-solution\.env`

```bash
# 腾讯云基础配置
TENCENT_SECRET_ID=你的SecretId
TENCENT_SECRET_KEY=你的SecretKey
TENCENT_APP_ID=你的APPID

# 数据库配置（可选，本地测试时）
MONGODB_URI=mongodb://localhost:27017/ai-photography
REDIS_URI=redis://localhost:6379

# 认证配置
JWT_SECRET=your_jwt_secret_key_here
WECHAT_APP_ID=你的微信小程序AppID
WECHAT_APP_SECRET=你的微信小程序AppSecret

# 存储配置
COS_SECRET_ID=你的SecretId (可以使用相同的)
COS_SECRET_KEY=你的SecretKey (可以使用相同的)
COS_BUCKET=ai-photo-prod-1379020062
COS_REGION=ap-guangzhou

# AI服务配置（根据实际情况填写）
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
SEEDREAM_API_KEY=your_seedream_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# 业务模式配置
BUSINESS_MODE=hybrid
ENABLE_CATALOG_INTEGRATION=false
ENABLE_SUBSCRIPTION=false

# 管理配置
ADMIN_SECRET=your_admin_secret_key
```

## 🚀 部署步骤

### 步骤1: 进入项目目录

```bash
cd "C:\Users\qq100\Desktop\迭代目录\2.0\scf-migration\ultimate-solution"
```

### 步骤2: 安装项目依赖

```bash
npm install --legacy-peer-deps
```

### 步骤3: 验证配置

```bash
sls --version
# 应该显示: Framework Core: 3.x.x.x

sls config credentials --provider tencent --key 你的SecretId --secret 你的SecretKey
```

### 步骤4: 部署到腾讯云

```bash
# 部署所有函数
sls deploy

# 或者逐步部署
sls deploy -f api-gateway
sls deploy -f user-service
sls deploy -f ai-generation-service
```

### 步骤5: 验证部署

```bash
# 查看部署信息
sls info

# 测试API网关
curl -X POST https://your-api-gateway-url/api/user/getInfo \
  -H "Content-Type: application/json" \
  -d '{"openid":"test_openid"}'
```

## 📊 部署后配置

### 1. 获取函数URL

部署成功后，Serverless Framework会输出各个函数的URL：

```
api-gateway:
  https://service-xxxx.gz.apigw.tencentcs.com/release/
user-service:
  https://service-xxxx.gz.apigw.tencentcs.com/release/
ai-generation-service:
  https://service-xxxx.gz.apigw.tencentcs.com/release/
```

### 2. 配置微信小程序

在小程序的 `app.js` 中更新API基础URL：

```javascript
// 原来：使用微信云开发
// wx.cloud.init({ env: 'your-env-id' })

// 现在：使用HTTP API
const API_BASE_URL = 'https://your-api-gateway-url/release'

// 更新API调用方式
// 原来：wx.cloud.callFunction({ name: 'user', data: {...} })
// 现在：wx.request({ url: `${API_BASE_URL}/user/getInfo`, method: 'POST', data: {...} })
```

## 🔍 常见问题解决

### 问题1: 认证失败

**错误**：`Authentication failed: invalid credentials`

**解决方案**：
1. 检查 `credentials.ini` 文件路径是否正确
2. 确认 SecretId 和 SecretKey 是否正确
3. 确认腾讯云账号是否有 SCF 权限

### 问题2: 部署超时

**错误**：`Deployment timeout`

**解决方案**：
1. 检查网络连接
2. 尝试部署单个函数：`sls deploy -f api-gateway`
3. 增加超时时间：`sls deploy --timeout 600000`

### 问题3: 函数创建失败

**错误**：`Function creation failed`

**解决方案**：
1. 检查函数名称是否重复
2. 确认区域设置是否正确
3. 检查内存和超时设置

### 问题4: 环境变量未生效

**错误**：`Environment variable not found`

**解决方案**：
1. 确认 `.env` 文件在项目根目录
2. 检查 `serverless-dotenv-plugin` 是否正确安装
3. 验证环境变量名称拼写

## 📋 部署检查清单

- [ ] 腾讯云API密钥已获取
- [ ] `credentials.ini` 文件已配置
- [ ] `.env` 文件已填写完整
- [ ] Node.js 和 Serverless Framework 已安装
- [ ] 项目依赖已安装
- [ ] `serverless.yml` 配置已验证
- [ ] 所有函数部署成功
- [ ] 函数URL已获取
- [ ] API测试通过
- [ ] 微信小程序配置已更新

## 🔄 数据迁移（可选）

如果需要从微信云开发迁移数据：

1. **导出微信云数据**：使用微信开发者工具的数据导出功能
2. **转换数据格式**：根据新的数据库结构调整数据
3. **导入到新数据库**：使用MongoDB导入工具

## 📞 技术支持

### 官方文档
- [腾讯云SCF文档](https://cloud.tencent.com/document/product/583)
- [Serverless Framework文档](https://cn.serverless.com/framework/docs)

### 项目文档
- 📖 [AI生图流程](docs/AI_GENERATION_FLOW.md)
- 📖 [项目计划](PROJECT_PLAN.md)
- 📖 [快速开始](QUICK_START.md)

---

## ✅ 部署完成确认

当你完成以下步骤时，部署即告成功：

1. ✅ 所有SCF函数部署成功
2. ✅ API网关可以正常访问
3. ✅ 用户注册登录功能正常
4. ✅ AI生成功能可以调用
5. ✅ 微信小程序可以正常使用

**恭喜！🎉 你的AI摄影师小程序已成功迁移到腾讯云SCF！**
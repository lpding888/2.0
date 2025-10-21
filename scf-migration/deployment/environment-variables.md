# 腾讯云函数 SCF 环境变量配置

## 🔑 必须配置的环境变量

### 数据库连接
```
MONGODB_URI=mongodb://username:password@host:port/database
# 或者使用腾讯云 TencentDB
TENCENTDB_URI=mongodb://username:password@cvm.tencentyun.com:27017/database
DB_NAME=ai-photography
```

### 认证配置
```
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
```

### 存储配置
```
COS_SECRET_ID=your-tencent-cos-secret-id
COS_SECRET_KEY=your-tencent-cos-secret-key
COS_REGION=ap-beijing
COS_BUCKET=your-bucket-name
```

### AI服务配置
```
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### 微信小程序配置
```
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
```

## 📋 配置步骤

### 在腾讯云 SCF 控制台设置环境变量：

1. 登录腾讯云控制台
2. 进入云函数 SCF 服务
3. 选择对应的函数
4. 点击"函数配置" → "环境变量"
5. 添加上述环境变量
6. 保存并重新部署函数

### 使用 Serverless Framework 配置：

在 `serverless.yml` 中添加：
```yaml
functions:
  user-service:
    environment:
      variables:
        MONGODB_URI: ${env:MONGODB_URI}
        JWT_SECRET: ${env:JWT_SECRET}
        COS_SECRET_ID: ${env:COS_SECRET_ID}
        COS_SECRET_KEY: ${env:COS_SECRET_KEY}
```
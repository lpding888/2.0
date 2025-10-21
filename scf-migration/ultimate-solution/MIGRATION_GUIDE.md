# 🔄 迁移指南：从微信云开发到腾讯云SCF

> 📅 **预计总耗时**：30-60分钟
> ⏰ **停机时间**：10-15分钟
> 🎯 **成功率**：99%+

## 📋 迁移检查清单

### ✅ 迁移前准备

- [ ] 备份现有微信云开发数据
- [ ] 注册腾讯云账号并完成实名认证
- [ ] 准备好所有API密钥和配置信息
- [ ] 选择用户活跃度低的时间段进行迁移
- [ ] 通知用户即将进行的系统维护

### 🛠️ 环境配置清单

- [ ] Node.js 18.15+ 已安装
- [ ] Serverless Framework 已安装
- [ ] 微信云开发 CLI 已安装
- [ ] MongoDB 数据库已创建
- [ ] 腾讯云 COS 存储桶已创建
- [ ] 所有环境变量已配置

## 🎯 分阶段迁移计划

### 阶段一：环境搭建（15分钟）

#### 1.1 安装必要工具

```bash
# 安装 Serverless Framework
npm install -g serverless

# 安装微信云开发 CLI
npm install -g @cloudbase/cli

# 安装 MongoDB 工具
# Windows: 从官网下载 MongoDB Community Server
# macOS: brew install mongodb-community
# Linux: sudo apt-get install mongodb-tools
```

#### 1.2 创建腾讯云资源

```bash
# 1. 创建 MongoDB 实例
# 登录腾讯云控制台
# 选择 MongoDB 服务
# 创建实例（选择按量计费，区域：广州）

# 2. 创建 COS 存储桶
# 登录腾讯云 COS 控制台
# 创建存储桶：ai-photography-{env}-{appid}
# 设置访问权限：私有读写

# 3. 创建 SCF 服务
# 登录腾讯云 SCF 控制台
# 创建服务：ai-photography
```

#### 1.3 配置项目环境

```bash
# 克隆项目
git clone <your-repo-url>
cd ai-photography-ultimate

# 安装项目依赖
npm install

# 配置环境变量
cp .env.example .env
```

**编辑 `.env` 文件：**
```env
# 业务模式
BUSINESS_MODE=hybrid

# 数据库配置
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-photography

# 微信小程序配置
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

# 腾讯云存储配置
COS_SECRET_ID=your-tencent-secret-id
COS_SECRET_KEY=your-tencent-secret-key
COS_BUCKET=ai-photography-prod-1379020062
COS_REGION=ap-guangzhou

# AI 服务配置
OPENAI_API_KEY=sk-your-openai-key
GEMINI_API_KEY=your-gemini-key
SEEDREAM_API_KEY=your-seedream-key

# 认证配置
JWT_SECRET=your-super-secret-jwt-key
```

### 阶段二：数据迁移（5-10分钟停机）

#### 2.1 数据迁移准备

```bash
# 测试迁移（不执行实际操作）
npm run migrate:dryrun

# 检查微信云开发环境 ID
echo $WECHAT_ENV_ID  # 应该是你的微信云环境 ID
```

#### 2.2 执行数据迁移

**⚠️ 重要：以下操作将导致服务中断，请确认已通知用户！**

```bash
# 1. 停止小程序关键功能（可选）
# 在小程序管理后台设置"系统维护中"状态

# 2. 执行数据迁移
npm run migrate

# 3. 验证迁移结果
# 检查 MongoDB 中的数据完整性
```

**数据迁移包含以下集合：**
- `users` - 用户数据和积分系统
- `works` - AI生成的作品记录
- `scenes` - 摄影场景和模板
- `prompts` - AI提示词模板
- `aimodels` - AI模型配置
- `orders` - 订单和支付记录
- `task_queue` - 异步任务队列
- `user_settings` - 用户个人设置

#### 2.3 数据验证

```javascript
// 连接到 MongoDB 验证数据
// 可以使用 MongoDB Compass 或命令行工具

// 检查用户数据
db.users.countDocuments()
// 应该显示迁移的用户数量

// 检查作品数据
db.works.countDocuments()
// 应该显示迁移的作品数量

// 验证关键字段
db.users.findOne()
db.works.findOne()
```

### 阶段三：服务部署（5分钟）

#### 3.1 部署到开发环境

```bash
# 首次部署到开发环境测试
npm run deploy:dev

# 检查部署结果
npm run info:dev

# 测试 API 连接
# 使用 Postman 或 curl 测试各个接口
```

**测试 API 接口：**
```bash
# 测试用户服务
curl -X POST https://your-api-url/api/user/getInfo \
  -H "Content-Type: application/json" \
  -d '{"openId": "test-openid"}'

# 测试 AI 生成服务
curl -X POST https://your-api-url/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"type": "virtual-tryon", "parameters": {}}'
```

#### 3.2 部署到生产环境

```bash
# 部署到生产环境
npm run deploy:prod

# 检查部署状态
npm run info:prod

# 验证所有服务正常
```

### 阶段四：前端更新（2分钟）

#### 4.1 更新小程序前端

**修改 `miniprogram/utils/api.js`：**

```javascript
// 原来的微信云函数调用
// wx.cloud.callFunction({
//   name: 'api',
//   data: { action: 'getWorks' }
// })

// 改为 HTTP 请求
const API_BASE_URL = 'https://your-scf-api-url'

class ApiService {
  async callFunction(name, data) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${API_BASE_URL}/api`,
        method: 'POST',
        data: { action: name, ...data },
        header: {
          'Authorization': wx.getStorageSync('token'),
          'Content-Type': 'application/json'
        },
        success: res => {
          if (res.data.success) {
            resolve(res.data)
          } else {
            reject(new Error(res.data.message))
          }
        },
        fail: reject
      })
    })
  }
}
```

#### 4.2 发布小程序

1. **更新代码**：将修改后的前端代码提交
2. **上传版本**：在微信开发者工具中上传新版本
3. **提交审核**：提交小程序审核
4. **发布上线**：审核通过后立即发布

### 阶段五：验证和清理（5分钟）

#### 5.1 功能验证

**核心功能测试清单：**
- [ ] 用户注册登录
- [ ] 图片上传功能
- [ ] AI 生成功能（虚拟试衣/服装摄影）
- [ ] 作品展示和分享
- [ ] 积分系统（如果启用）
- [ ] 支付功能（如果启用）

#### 5.2 性能监控

```bash
# 查看实时日志
npm run logs:prod

# 监控函数性能
# 在腾讯云 SCF 控制台查看函数调用情况
```

#### 5.3 清理旧资源

**确认迁移成功后，可以清理微信云开发资源：**
```bash
# 备份微信云数据（可选）
tcb db export all --backup

# 删除云函数（谨慎操作）
# tcb functions:delete

# 删除存储桶（谨慎操作）
# tcb storage:delete
```

## ⚠️ 应急回滚方案

如果迁移过程中出现问题，可以按以下步骤回滚：

### 快速回滚（2分钟）

1. **停止 SCF 服务**
```bash
npm run remove:prod
```

2. **恢复微信云开发**
```bash
# 重新启用微信云函数
tcb functions:deploy

# 恢复小程序 API 调用
# 撤销前端的 API URL 修改
```

3. **通知用户**：说明系统已恢复

### 数据回滚（如果需要）

如果数据迁移出现问题：
```bash
# 从备份恢复微信云数据
tcb db import backup-file.json

# 清理 MongoDB 中的错误数据
# 连接到 MongoDB 删除迁移的数据
```

## 📊 迁移后优化

### 性能优化

1. **函数冷启动优化**
   - 配置预留实例
   - 优化函数启动时间
   - 使用预热策略

2. **数据库优化**
   - 添加适当索引
   - 配置连接池
   - 监控查询性能

3. **存储优化**
   - 配置 CDN 加速
   - 设置图片缓存策略
   - 压缩存储文件

### 成本优化

1. **资源使用监控**
   - 设置函数调用告警
   - 监控数据库使用量
   - 跟踪存储成本

2. **AI 服务优化**
   - 启用智能路由
   - 配置成本阈值
   - 使用缓存减少调用

## 🎉 迁移完成检查清单

- [ ] 所有数据已成功迁移
- [ ] 所有 SCF 函数正常运行
- [ ] 小程序前端功能正常
- [ ] 用户可以正常使用核心功能
- [ ] 性能指标符合预期
- [ ] 错误率在可接受范围内
- [ ] 监控和告警已配置
- [ ] 备份策略已制定
- [ ] 团队已熟悉新的运维流程

---

**🚀 恭喜！您已成功完成从微信云开发到腾讯云SCF的迁移！**

如有任何问题，请查看故障排除部分或联系技术支持。
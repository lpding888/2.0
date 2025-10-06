# 支付功能部署和测试指南

## 📋 部署清单

### 1. 云函数部署
需要重新部署 `payment` 云函数，因为添加了新功能：

```bash
# 在微信开发者工具中
1. 右键点击 cloudfunctions/payment 文件夹
2. 选择 "上传并部署：云端安装依赖"
3. 等待部署完成
```

### 2. 数据库初始化
确保以下集合存在并有适当的权限设置：

**必需的集合：**
- ✅ `packages` - 套餐数据
- ✅ `orders` - 订单数据
- ✅ `daily_checkins` - 签到记录
- ✅ `users` - 用户数据
- ✅ `admin_users` - 管理员数据

**初始化套餐数据：**
```javascript
// 在开发者工具控制台运行
load('init-packages-collection.js')
```

### 3. 权限配置
确保数据库权限设置正确：

```javascript
// packages 集合权限（读取公开，写入仅管理员）
{
  "read": true,
  "write": "auth.openid in get('database.admin_users.openid')"
}

// orders 集合权限（仅自己的订单）
{
  "read": "auth.openid == resource.user_openid",
  "write": "auth.openid == resource.user_openid"
}

// users 集合权限（仅自己的数据）
{
  "read": "auth.openid == resource.openid",
  "write": "auth.openid == resource.openid"
}
```

## 🧪 功能测试清单

### 测试前准备
1. 确保已部署最新的 payment 云函数
2. 确保数据库集合都存在且有正确权限
3. 确保用户已登录（有 openid）

### 1. 基础功能测试

**测试套餐获取：**
```javascript
// 在开发者工具控制台运行
wx.cloud.callFunction({
  name: 'payment',
  data: { action: 'getPackages' }
}).then(res => console.log('套餐列表:', res.result))
```

**测试订单创建：**
```javascript
// 运行测试脚本
load('test-payment-flow.js')
```

### 2. 支付流程测试

**步骤1：创建测试订单**
1. 进入小程序充值页面
2. 选择任意套餐
3. 点击购买按钮
4. 检查是否正确显示"创建订单中..."

**步骤2：支付参数检查**
1. 观察开发者工具控制台
2. 检查是否有支付参数输出
3. 验证支付参数格式是否正确

**步骤3：支付调起测试**
1. 如果支付参数正确，应该能调起微信支付
2. 测试取消支付流程
3. 测试支付成功流程（沙箱环境）

### 3. 管理员功能测试

**测试套餐管理：**
1. 确保你的 openid 在 admin_users 集合中
2. 进入管理中心 -> 套餐管理
3. 测试添加/编辑/删除套餐功能

### 4. 错误处理测试

**测试超时订单：**
```javascript
// 手动清理过期订单（测试用）
wx.cloud.callFunction({
  name: 'payment',
  data: {
    action: 'cleanExpiredOrders',
    expireMinutes: 1 // 1分钟过期（测试用）
  }
}).then(res => console.log('清理结果:', res.result))
```

**测试订单状态查询：**
```javascript
// 查询特定订单状态
wx.cloud.callFunction({
  name: 'payment',
  data: {
    action: 'checkOrderStatus',
    orderId: 'your_order_id_here'
  }
}).then(res => console.log('订单状态:', res.result))
```

## ⚠️ 常见问题排查

### 问题1：微信支付调起失败
**可能原因：**
- 云开发支付配置不正确
- 支付参数格式错误
- 小程序支付权限问题

**排查步骤：**
1. 检查云开发控制台支付设置
2. 查看控制台支付参数输出
3. 验证商户号和密钥配置

### 问题2：套餐管理权限错误
**解决方案：**
```javascript
// 添加管理员权限
wx.cloud.callFunction({
  name: 'auth',
  data: {
    action: 'addAdmin',
    openid: 'your_openid_here',
    permissions: ['packages']
  }
})
```

### 问题3：订单状态异常
**排查步骤：**
1. 检查 orders 集合数据
2. 查看云函数日志
3. 运行订单状态检查

### 问题4：积分未到账
**可能原因：**
- 支付回调处理失败
- 用户数据更新失败
- 网络问题导致处理中断

**解决方案：**
1. 手动触发支付回调
2. 检查用户积分字段
3. 查看详细日志

## 🚀 性能优化建议

### 1. 定期清理过期订单
建议设置定时器定期清理：
```javascript
// 可以设置云函数定时触发
// 每小时清理一次过期订单
```

### 2. 支付状态监控
- 监控支付成功率
- 记录支付失败原因
- 优化支付流程体验

### 3. 错误日志分析
- 定期查看云函数日志
- 分析常见错误模式
- 优化错误处理逻辑

## 📞 技术支持

如果遇到问题：
1. 首先运行测试脚本诊断
2. 查看云函数实时日志
3. 检查数据库权限设置
4. 验证微信支付配置

## 🎯 部署完成检查

部署完成后，请确认：
- [ ] payment 云函数部署成功
- [ ] 数据库集合权限正确
- [ ] 套餐数据初始化完成
- [ ] 基础功能测试通过
- [ ] 支付流程测试正常
- [ ] 管理员功能可用
- [ ] 错误处理机制工作正常

完成所有检查后，支付功能即可正常使用！
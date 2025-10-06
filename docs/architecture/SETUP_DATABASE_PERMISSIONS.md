# 数据库权限设置操作指南

## 在微信开发者工具中设置数据库权限

### 步骤1：打开数据库控制台
1. 在微信开发者工具中打开您的小程序项目
2. 点击左侧菜单"云开发"
3. 选择"数据库"选项卡

### 步骤2：为每个集合设置权限

#### 1. admin_users 集合权限设置
```
权限类型：仅管理端可读写
读权限：false
写权限：false
```
**操作步骤：**
- 找到 `admin_users` 集合
- 点击右侧的"设置"按钮
- 选择"仅管理端可读写"
- 保存设置

#### 2. users 集合权限设置
```
权限类型：自定义安全规则
读权限：doc._openid == auth.openid
写权限：doc._openid == auth.openid
```
**操作步骤：**
- 找到 `users` 集合
- 点击右侧的"设置"按钮
- 选择"自定义安全规则"
- 在读权限框中输入：`doc._openid == auth.openid`
- 在写权限框中输入：`doc._openid == auth.openid`
- 保存设置

#### 3. works 集合权限设置
```
权限类型：自定义安全规则
读权限：doc._openid == auth.openid
写权限：doc._openid == auth.openid
```
**操作步骤：**
- 找到 `works` 集合
- 点击右侧的"设置"按钮
- 选择"自定义安全规则"
- 在读权限框中输入：`doc._openid == auth.openid`
- 在写权限框中输入：`doc._openid == auth.openid`
- 保存设置

#### 4. api_configs 集合权限设置
```
权限类型：所有用户可读，仅管理端可写
读权限：true
写权限：false
```
**操作步骤：**
- 找到 `api_configs` 集合
- 点击右侧的"设置"按钮
- 选择"所有用户可读，仅管理端可写"
- 保存设置

#### 5. prompt_templates 集合权限设置
```
权限类型：所有用户可读，仅管理端可写
读权限：true
写权限：false
```
**操作步骤：**
- 找到 `prompt_templates` 集合
- 点击右侧的"设置"按钮
- 选择"所有用户可读，仅管理端可写"
- 保存设置

#### 6. scenes 集合权限设置
```
权限类型：所有用户可读，仅管理端可写
读权限：true
写权限：false
```
**操作步骤：**
- 找到 `scenes` 集合
- 点击右侧的"设置"按钮
- 选择"所有用户可读，仅管理端可写"
- 保存设置

### 步骤3：创建管理员用户记录

#### 手动添加管理员记录
1. 在数据库控制台中找到 `admin_users` 集合
2. 点击"添加记录"按钮
3. 输入以下JSON数据：

```json
{
  "_openid": "您的微信openid",
  "username": "super_admin",
  "role": "super_admin",
  "permissions": [
    "manage_models",
    "manage_prompts",
    "manage_scenes",
    "view_users",
    "manage_works"
  ],
  "created_time": "2024-01-01 00:00:00",
  "updated_time": "2024-01-01 00:00:00",
  "is_active": true,
  "last_login": null
}
```

**获取您的openid方法：**
1. 在小程序中任意页面的onLoad函数中添加：
```javascript
onLoad() {
  wx.cloud.callFunction({
    name: 'login',
    success: res => {
      console.log('您的openid是：', res.result.openid)
      // 将这个openid复制到管理员记录中
    }
  })
}
```

2. 或者使用云函数获取：
```javascript
// 在任意云函数中
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  console.log('openid:', OPENID)
  return { openid: OPENID }
}
```

### 步骤4：验证权限设置

#### 测试普通用户权限
1. 使用非管理员账号登录小程序
2. 尝试访问管理功能（应该被拒绝）
3. 查看用户自己的数据（应该可以访问）

#### 测试管理员权限
1. 使用管理员账号登录小程序
2. 连续点击头像10次进入管理中心
3. 测试各种管理功能

### 步骤5：安全检查清单

- [ ] admin_users 集合设置为"仅管理端可读写"
- [ ] users 集合设置为"仅创建者可读写"  
- [ ] works 集合设置为"仅创建者可读写"
- [ ] api_configs 集合设置为"所有用户可读，仅管理端可写"
- [ ] prompt_templates 集合设置为"所有用户可读，仅管理端可写"
- [ ] scenes 集合设置为"所有用户可读，仅管理端可写"
- [ ] 管理员记录已正确添加到 admin_users 集合
- [ ] 权限验证功能测试通过

### 常见问题解决

#### 问题1：无法访问管理功能
**解决方案：**
1. 检查您的openid是否正确添加到admin_users集合
2. 确认admin_users记录中的is_active字段为true
3. 检查权限数组是否包含所需权限

#### 问题2：普通用户能看到其他用户数据
**解决方案：**
1. 检查users和works集合的权限设置
2. 确保使用了正确的安全规则：`doc._openid == auth.openid`

#### 问题3：用户无法读取基础数据
**解决方案：**
1. 检查api_configs、prompt_templates、scenes集合权限
2. 确保读权限设置为true

### 部署后验证步骤

1. **测试用户数据隔离**
   - 用两个不同账号分别创建数据
   - 验证各自只能看到自己的数据

2. **测试管理员功能**
   - 管理员登录后能正常使用管理中心
   - 非管理员无法访问管理功能

3. **测试基础数据访问**
   - 所有用户都能读取场景、提示词、AI模型列表
   - 用户无法直接修改这些基础数据

权限设置完成后，您的AI摄影师小程序就具备了完整的数据安全保护机制！
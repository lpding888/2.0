# AI摄影师小程序数据库权限配置

## 权限配置说明

微信小程序云开发数据库权限分为以下几种：
- `仅创建者可读写` - 只有数据创建者可以读写自己创建的数据
- `所有用户可读，仅创建者可写` - 所有登录用户可读，只有创建者可写
- `仅管理端可读写` - 只能通过云函数或控制台操作
- `所有用户可读，仅管理端可写` - 用户可读，只能通过云函数写入

## 集合权限配置

### 1. admin_users - 管理员用户集合
**权限设置：仅管理端可读写**

```json
{
  "read": false,
  "write": false
}
```

**说明：**
- 管理员信息高度敏感，只能通过云函数操作
- 前端无法直接读取或修改管理员数据
- 需要通过专门的权限验证云函数来检查用户是否为管理员

**数据结构：**
```javascript
{
  _id: "record_id",
  _openid: "user_openid", // 管理员的openid
  username: "admin",      // 管理员用户名
  role: "super_admin",    // 角色：super_admin/admin
  permissions: [          // 权限列表
    "manage_models",
    "manage_prompts", 
    "manage_scenes",
    "view_users",
    "manage_works"
  ],
  created_time: "2024-01-01 00:00:00",
  updated_time: "2024-01-01 00:00:00",
  is_active: true,        // 是否激活
  last_login: "2024-01-01 00:00:00"
}
```

### 2. users - 用户信息集合
**权限设置：仅创建者可读写**

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

**说明：**
- 用户只能读写自己的信息
- 保护用户隐私，防止信息泄露
- 管理员可通过云函数查看用户信息（用于管理目的）

**数据结构：**
```javascript
{
  _id: "record_id",
  _openid: "user_openid",
  nickname: "用户昵称",
  avatar_url: "头像URL",
  gender: 0,              // 性别：0未知/1男/2女
  city: "城市",
  province: "省份", 
  country: "国家",
  points: 100,            // 积分余额
  vip_level: 0,           // VIP等级
  vip_expire_time: null,  // VIP过期时间
  total_works: 0,         // 总作品数
  created_time: "2024-01-01 00:00:00",
  updated_time: "2024-01-01 00:00:00",
  last_login: "2024-01-01 00:00:00",
  is_active: true
}
```

### 3. works - 用户作品集合
**权限设置：仅创建者可读写**

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

**说明：**
- 用户只能查看和管理自己的作品
- 作品包含用户创作的AI图像和相关信息
- 管理员可通过云函数查看所有作品（用于内容审核）

**数据结构：**
```javascript
{
  _id: "record_id",
  _openid: "user_openid",
  title: "作品标题",
  description: "作品描述",
  image_url: "图片URL",
  thumbnail_url: "缩略图URL",
  scene_id: "scene_record_id",    // 使用的场景ID
  prompt_used: "使用的提示词",
  ai_model: "使用的AI模型",
  generation_params: {           // 生成参数
    style: "写实",
    quality: "high",
    size: "1024x1024"
  },
  tags: ["标签1", "标签2"],
  is_public: false,              // 是否公开
  likes_count: 0,                // 点赞数
  views_count: 0,                // 查看数
  created_time: "2024-01-01 00:00:00",
  updated_time: "2024-01-01 00:00:00",
  status: "completed"            // 状态：generating/completed/failed
}
```

### 4. api_configs - AI模型配置集合
**权限设置：所有用户可读，仅管理端可写**

```json
{
  "read": true,
  "write": false
}
```

**说明：**
- 用户需要读取可用的AI模型列表
- 只有管理员可以通过云函数添加/修改AI模型配置
- 敏感信息（如API密钥）不会返回给前端

### 5. prompt_templates - 提示词模板集合
**权限设置：所有用户可读，仅管理端可写**

```json
{
  "read": true,
  "write": false
}
```

**说明：**
- 用户需要读取提示词模板用于生成图像
- 只有管理员可以通过云函数管理提示词模板
- 支持变量替换和多语言

### 6. scenes - 场景集合
**权限设置：所有用户可读，仅管理端可写**

```json
{
  "read": true,
  "write": false
}
```

**说明：**
- 用户需要读取场景列表选择拍摄场景
- 只有管理员可以通过云函数管理场景
- 包含场景预览图和相关提示词

### 7. packages - 充值套餐集合（如需要）
**权限设置：所有用户可读，仅管理端可写**

```json
{
  "read": true,
  "write": false
}
```

## 权限验证云函数

### checkAdminPermission - 管理员权限验证
```javascript
// 在需要管理员权限的云函数中调用
async function checkAdminPermission(openid, requiredPermission = null) {
  const adminResult = await db.collection('admin_users')
    .where({
      _openid: openid,
      is_active: true
    })
    .get()
  
  if (adminResult.data.length === 0) {
    throw new Error('无管理员权限')
  }
  
  const admin = adminResult.data[0]
  
  if (requiredPermission && !admin.permissions.includes(requiredPermission)) {
    throw new Error(`缺少权限: ${requiredPermission}`)
  }
  
  return admin
}
```

## 安全最佳实践

1. **敏感数据保护**
   - API密钥、管理员信息等敏感数据只能通过云函数操作
   - 前端无法直接访问敏感集合

2. **用户数据隔离**
   - 用户只能访问自己创建的数据
   - 通过`_openid`字段自动实现数据隔离

3. **权限分级管理**
   - 区分超级管理员和普通管理员
   - 通过permissions数组控制细粒度权限

4. **操作日志**
   - 记录管理员的重要操作
   - 便于审计和问题排查

5. **数据验证**
   - 在云函数中进行数据格式验证
   - 防止恶意数据写入

## 部署步骤

1. 在微信开发者工具中打开数据库面板
2. 为每个集合设置对应的权限规则
3. 创建admin_users集合并添加管理员记录
4. 部署相关云函数
5. 测试权限配置是否生效
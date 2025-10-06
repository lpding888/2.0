# AI摄影师小程序

一款基于微信云开发的AI服装摄影与虚拟试衣小程序,通过AI技术为服装商家和个人用户提供专业级的商品展示照片。

## 项目简介

### 核心功能

AI摄影师小程序为电商卖家、服装设计师、个人用户提供AI驱动的服装拍摄解决方案,无需实拍、无需棚拍,即可获得专业级模特展示效果。

**主要使用场景:**
- 📸 **电商卖家**: 快速生成多场景商品图,提升转化率
- 👔 **服装设计师**: 展示设计作品,节省拍摄成本
- 🛍️ **个人用户**: 虚拟试衣,查看上身效果
- 🎨 **营销团队**: 批量生成多风格素材,满足多渠道需求

### 技术特点

- ✅ **Serverless架构**: 基于微信云开发,零服务器运维
- ✅ **Fire-and-Forget模式**: 异步Worker处理,避免超时
- ✅ **Base64预处理**: 前端预处理图片,降低云函数内存压力
- ✅ **原子操作**: 数据库原子递增/递减,保证并发安全
- ✅ **云函数预热**: 定时ping防止冷启动
- ✅ **智能缓存**: 5分钟TTL缓存,减少数据库查询
- ✅ **iOS支付限制**: 自动检测iOS平台并引导用户

## 核心功能详解

### 1. AI服装摄影

上传服装图片(平铺图/挂拍图/模特图),选择拍摄场景和模特参数,AI自动生成专业级商品展示照。

**功能特性:**
- 支持上传1-3张服装图片
- 自定义场景描述(最多500字)或选择预设场景
- 模特参数可调: 性别、年龄、身高、国籍、肤色
- 高级选项: 动作姿势、服装材质、搭配风格、配饰、氛围、光线
- 参数预设: 保存常用配置,一键加载
- 每次生成消耗1积分

**实现路径:** `miniprogram/pages/photography/` + `cloudfunctions/photography/` + `cloudfunctions/photography-worker/`

### 2. AI虚拟试衣

上传人物照片和服装图片,AI自动将服装"穿"到人物身上,实现虚拟试衣效果。

**功能特性:**
- 上传1张人物照片 + 1-3张服装图片
- 支持自定义场景和预设场景
- 每次生成消耗1积分

**实现路径:** `miniprogram/pages/fitting/` + `cloudfunctions/fitting/` + `cloudfunctions/fitting-worker/`

### 3. 姿势裂变

基于已有作品,保持服装和场景不变,仅改变模特姿势,快速生成多组不同动作的照片。

**功能特性:**
- 从现有作品发起裂变
- 自定义姿势描述或选择预设姿势
- 复用原作品的服装和场景信息
- 每次生成消耗1积分

**实现路径:** `miniprogram/pages/work-detail/` → `photography` 云函数(`mode: 'pose_variation'`)

### 4. 我的作品

管理所有AI生成的作品,支持查看、下载、收藏、删除等操作。

**功能特性:**
- 瀑布流展示,分页加载(每页20条)
- 筛选: 全部/服装摄影/虚拟试衣/收藏
- 作品详情: 查看生成参数、原图、下载、删除、收藏
- 分享海报: 生成带水印的分享图(可配置水印开关)
- 姿势裂变入口

**实现路径:** `miniprogram/pages/works/` + `miniprogram/pages/work-detail/` + `cloudfunctions/api/`

### 5. 积分系统

完整的积分充值、消费、记录管理体系。

**积分获取:**
- 🎁 新用户注册: +10 积分
- 📅 每日签到: +5 积分
- 🤝 邀请好友: 每邀请1人 +10 积分(被邀请者也获得 +10)
- 💳 充值套餐:
  - 25积分 = ¥9.9
  - 60积分 = ¥19.9
  - 100积分 = ¥29.9
  - 300积分 = ¥79.9

**积分消耗:**
- AI生成(摄影/试衣/姿势裂变): 每张 -1 积分

**iOS限制:**
- 自动检测iOS设备,禁止虚拟支付(符合苹果政策)
- 引导用户联系客服(17620309403)或使用安卓设备充值

**实现路径:** `miniprogram/pages/recharge/` + `miniprogram/pages/credits/` + `cloudfunctions/payment/` + `cloudfunctions/user/`

### 6. 管理中心(隐藏功能)

为管理员提供后台管理功能,包括场景管理、AI模型配置等。

**激活方式:** 个人中心页面,连续点击头像15次

**管理功能:**
- 场景管理: 上传场景图片、配置参数
- AI模型管理: 配置多个API密钥、选择AI提供商
- 用户管理: 查看用户数据、调整积分
- 权限控制: 基于 `admin_users` 集合的角色验证

**实现路径:** `miniprogram/pages/subPackageAdmin/` + `cloudfunctions/scene/` + `cloudfunctions/aimodels/`

## 技术架构

### 云函数列表(16个)

**核心云函数:**
- `user` - 用户注册、登录、积分查询
- `api` - 作品查询、收藏、删除(统一入口)
- `payment` - 充值订单、套餐管理、支付回调
- `photography` - AI摄影任务调度(Fire-and-Forget)
- `fitting` - AI试衣任务调度(Fire-and-Forget)

**Worker云函数:**
- `photography-worker` - 执行AI图片生成(60-120s)
- `fitting-worker` - 执行AI试衣生成(60-120s)

**辅助云函数:**
- `scene` - 场景数据管理
- `prompt` - AI提示词模板管理
- `storage` - 云存储文件管理、去重
- `aimodels` - AI模型配置、密钥轮换
- `auth` - 权限验证、管理员检查
- `task-processor` - 异步任务处理器
- `database-init` - 数据库初始化
- `debug-scenes` - 调试场景数据
- `force-admin` - 强制设置管理员权限

### Fire-and-Forget异步模式

AI图片生成耗时较长(60-120秒),微信云函数有60秒超时限制。采用**Fire-and-Forget**模式解决:

```
用户发起生成请求
    ↓
photography 云函数(主函数)
    ├─ 扣除积分(-1)
    ├─ 创建任务记录(task_queue)
    ├─ 创建作品记录(works, status=generating)
    ├─ 异步调用 photography-worker(不等待)
    └─ 立即返回 task_id 和 work_id(< 3秒)
         ↓
    用户收到响应,跳转到作品页
         ‖
         ‖  (并行执行,不阻塞用户)
         ‖
    photography-worker 云函数(独立容器)
    ├─ 下载服装图片(支持Base64预处理)
    ├─ 调用AI服务商API生成图片
    ├─ 上传生成结果到云存储
    ├─ 更新作品状态(status=completed/failed)
    ├─ 更新任务状态
    └─ 失败时自动退款(db.command.inc(1))
         ↓
    前端轮询或刷新查看结果
```

**关键设计:**
- 主函数只捕获**真正的失败**(非timeout),只有真失败才退款
- Worker超时不退款(因为后台可能仍在执行)
- Worker内部失败会执行退款逻辑

### Base64预处理优化

**问题:** 云函数处理多张图片时,频繁进行图片下载、格式转换,导致内存占用过高,触发 `RequestTooLarge` 错误。

**解决方案:** 将图片转换操作前移到小程序端

```
传统模式:
  小程序 → 上传图片文件 → 云存储 → Worker下载 → 转换Base64 → 调用AI

优化模式(Base64预处理):
  小程序 → 转换Base64 → 上传Base64字符串 → 云存储 → Worker直接读取 → 调用AI
```

**实现细节:**
- `miniprogram/utils/upload.js`: 增加 `base64Mode` 参数
- Worker函数检测文件内容:
  ```javascript
  const fileContent = downloadResult.fileContent.toString('utf8')
  if (fileContent.startsWith('data:image/')) {
    // Base64预处理模式,直接使用
    const matches = fileContent.match(/^data:image\/([^;]+);base64,(.+)$/)
    base64Data = matches[2]
  } else {
    // 兼容旧模式,转换二进制数据
    base64Data = downloadResult.fileContent.toString('base64')
  }
  ```

**效果:**
- 云函数内存占用降低 60%+
- 生成成功率提升至 95%+
- 支持旧数据兼容

### 云函数预热机制

防止冷启动导致首次调用延迟过高。

**实现:** `miniprogram/app.js`
```javascript
// 每4分钟预热一次
this.warmUpTimer = setInterval(() => {
  wx.cloud.callFunction({
    name: 'api',
    data: { action: 'ping', __noLoading: true }
  })
}, 4 * 60 * 1000)
```

## 数据库设计

### 集合列表(14个)

| 集合名 | 说明 | 主要字段 |
|--------|------|----------|
| `users` | 用户信息 | openid, nickname, avatar, credits, total_earned_credits, invite_code |
| `works` | AI生成作品 | work_id, user_openid, type, status, images, parameters, scene_id |
| `task_queue` | 任务队列 | task_id, user_openid, status, work_id, parameters, created_at |
| `credit_records` | 积分记录 | user_openid, type, amount, description, balance_after, created_at |
| `orders` | 充值订单 | order_id, user_openid, package_id, amount, status, payment_result |
| `packages` | 充值套餐 | package_id, credits, price, name, description, enabled |
| `scenes` | 拍摄场景 | scene_id, name, thumbnail_url, category, parameters, enabled |
| `prompt_templates` | AI提示词模板 | template_id, name, template, variables, category |
| `aimodels` | AI模型配置 | model_id, provider, api_key, model_name, enabled, priority |
| `daily_checkins` | 签到记录 | user_openid, checkin_date, created_at |
| `invite_records` | 邀请记录 | inviter_openid, invitee_openid, invite_code, reward_status |
| `pose_presets` | 姿势预设 | preset_id, name, description, category, thumbnail_url |
| `admin_users` | 管理员 | openid, role, permissions, created_at |
| `logs` | 系统日志 | log_id, level, message, function_name, created_at |

### 核心集合详解

#### users(用户表)

```javascript
{
  "_id": "auto",
  "openid": "oXXXX",              // 微信openid(唯一)
  "nickname": "用户昵称",
  "avatar": "https://...",        // 头像URL
  "credits": 120,                 // 当前积分余额
  "total_earned_credits": 150,    // 累计获得积分
  "total_spent_credits": 30,      // 累计消费积分
  "invite_code": "ABC123",        // 邀请码(6位随机)
  "invited_by": "oYYYY",          // 邀请人openid
  "created_at": Date,             // 注册时间
  "last_login_at": Date           // 最后登录时间
}
```

#### works(作品表)

```javascript
{
  "_id": "auto",
  "work_id": "work_1234567890",   // 作品ID
  "user_openid": "oXXXX",         // 创建者
  "type": "photography",          // 类型: photography / fitting / pose_variation
  "status": "completed",          // 状态: generating / completed / failed
  "mode": "normal",               // 模式: normal / pose_variation

  // 输入数据
  "images": [                     // 原始图片URL数组
    { "url": "cloud://...", "type": "clothing" }
  ],
  "parameters": {                 // 生成参数
    "gender": "female",
    "age": 25,
    "height": 170,
    "nationality": "asian",
    "skin_tone": "fair",
    "location": "户外·湖边木栈道",
    "pose_type": "自然站姿",
    // ... 其他参数
  },
  "scene_id": "scene_123",        // 场景ID(如果使用预设场景)
  "scene_info": { ... },          // 场景详细信息

  // 输出数据
  "generated_images": [           // 生成的图片URL数组
    {
      "url": "cloud://...",
      "size": 1024000,
      "format": "png"
    }
  ],

  // 元数据
  "task_id": "task_123",          // 关联任务ID
  "ai_model": "model_456",        // 使用的AI模型
  "generation_time": 45000,       // 生成耗时(毫秒)
  "is_favorite": false,           // 是否收藏
  "created_at": Date,             // 创建时间
  "updated_at": Date              // 更新时间
}
```

#### credit_records(积分记录表)

```javascript
{
  "_id": "auto",
  "user_openid": "oXXXX",
  "type": "consume",              // 类型: earn / consume / refund
  "amount": 1,                    // 积分数量(正数)
  "description": "AI摄影生成",    // 描述
  "balance_after": 119,           // 操作后余额
  "order_id": "order_123",        // 关联订单ID(充值时)
  "work_id": "work_456",          // 关联作品ID(消费/退款时)
  "task_id": "task_789",          // 关联任务ID
  "created_at": Date
}
```

**积分类型(type):**
- `signup_bonus` - 新用户注册奖励 (+10)
- `daily_checkin` - 每日签到 (+5)
- `invite_reward` - 邀请奖励 (+10)
- `recharge` - 充值获得
- `consume` - 生成消费 (-1)
- `refund` - 生成失败退款 (+1)

## 快速开始

### 环境要求

- **微信开发者工具**: 最新稳定版
- **Node.js**: v14+ (用于云函数开发)
- **微信云开发账号**: 已开通云开发服务
- **云环境ID**: cloudbase-0gu1afji26f514d2

### 本地开发

1. **配置云环境**
   - 修改 `miniprogram/app.js` 中的云环境ID(如需更换)

2. **安装云函数依赖**
   ```bash
   # 为每个云函数安装依赖
   cd cloudfunctions/user
   npm install
   # ... 重复其他云函数
   ```

3. **上传云函数**
   - 使用部署脚本:
     ```powershell
     .\scripts\deploy\deploy-cloudfunctions.ps1
     ```
   - 或在微信开发者工具中手动上传

4. **初始化数据库**
   ```bash
   node scripts/setup/database-init.js
   ```

5. **配置环境变量**
   - 在云开发控制台配置:
     - `ADMIN_OPENIDS`: 管理员openid列表
     - `WATERMARK_ENABLED`: 是否启用水印
     - `WECHAT_PAY_MCHID`: 微信支付商户号
     - `WECHAT_PAY_KEY`: 微信支付API密钥

### 配置AI模型

1. 登录管理后台(个人中心连续点击头像15次)
2. 进入"AI模型管理"
3. 添加AI API密钥(Google/OpenAI/Anthropic)

### 配置场景数据

1. 在管理后台"场景管理"中添加场景
2. 或使用脚本导入默认场景

## 部署清单

- [ ] 已上传所有云函数
- [ ] 已初始化数据库集合和索引
- [ ] 已配置AI模型API密钥
- [ ] 已配置微信支付参数
- [ ] 已上传拍摄场景
- [ ] 已设置管理员账号
- [ ] 已配置云存储安全规则
- [ ] 已配置数据库权限规则

## 维护手册

### 常见问题处理

#### 1. 用户积分异常

查询积分记录:
```javascript
db.collection('credit_records')
  .where({ user_openid: '<openid>' })
  .orderBy('created_at', 'desc')
  .limit(50)
  .get()
```

#### 2. AI生成失败率高

- 查看Worker云函数日志
- 检查AI模型配置
- 检查API密钥是否过期
- 添加备用API密钥

#### 3. 支付回调未触发

- 查询订单状态
- 检查payment云函数日志
- 手动触发支付回调

### 数据库维护

1. **清理过期订单**(建议每周)
2. **清理失败任务**(建议每天)
3. **数据备份**(建议每天)

## 常见问题 FAQ

### Q1: 如何添加新的管理员?

```bash
node scripts/setup/setup-admin-user.js --openid=<user_openid>
```

### Q2: 如何修改充值套餐价格?

在数据库 `packages` 集合中直接修改

### Q3: 如何关闭水印功能?

在云开发控制台设置环境变量 `WATERMARK_ENABLED = false`

### Q4: 为什么iOS设备无法充值?

根据苹果政策,iOS应用内购买虚拟商品必须使用苹果IAP,不允许使用微信支付。已自动检测iOS平台并阻止支付。

### Q5: 如何备份和恢复数据?

```bash
# 备份
tcb db export -e <env-id> -c users,works,orders --file-path ./backup

# 恢复
tcb db import -e <env-id> -c users --file-path ./backup/users.json
```

## 技术支持

**客服电话/微信**: 17620309403
**工作时间**: 9:00 - 22:00

## 更新日志

### v2.0.0 (2025-10-05)

**新功能:**
- ✅ 完整的AI服装摄影和虚拟试衣功能
- ✅ 姿势裂变功能
- ✅ 积分系统(充值、消费、签到、邀请)
- ✅ iOS支付限制检测
- ✅ 管理后台(场景管理、AI模型管理)
- ✅ 自定义场景支持500字描述

**技术优化:**
- ✅ Fire-and-Forget异步模式
- ✅ Base64预处理优化
- ✅ 云函数预热机制
- ✅ 智能缓存(5分钟TTL)
- ✅ 原子操作保证并发安全

---

**最后更新时间**: 2025-10-05
**文档版本**: v2.0.0
**维护者**: AI摄影师开发团队

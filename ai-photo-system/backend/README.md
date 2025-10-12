# AI Photo System - 后端API服务

AI摄影系统后端API服务，基于Node.js + Express + MySQL + Redis构建。

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 7.0
- PM2 (生产环境)

### 安装依赖

```bash
cd backend
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env`，并修改配置：

```bash
cp .env.example .env
nano .env
```

必须配置的变量：
- `DB_PASSWORD`: 数据库密码
- `JWT_SECRET`: JWT密钥（建议随机生成）
- `WECHAT_APP_SECRET`: 微信小程序密钥
- `N8N_WEBHOOK_BASE_URL`: n8n webhook地址

### 初始化数据库

```bash
# 导入数据库结构
mysql -u ai_photo -p ai_photo < ../database/init.sql
```

### 启动服务

#### 开发模式

```bash
npm run dev
```

#### 生产模式

```bash
npm start
```

#### PM2部署

```bash
pm2 start src/app.js --name ai-photo-backend
pm2 save
pm2 startup
```

## 📁 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.js  # MySQL连接池
│   │   ├── redis.js     # Redis客户端
│   │   └── queue.js     # Bull队列配置
│   ├── middleware/      # 中间件
│   │   ├── auth.js      # JWT认证
│   │   ├── validation.js # 参数验证
│   │   └── errorHandler.js # 错误处理
│   ├── routes/          # 路由
│   │   ├── authRoutes.js      # 认证路由
│   │   ├── worksRoutes.js     # 作品路由
│   │   ├── tasksRoutes.js     # 任务路由
│   │   ├── scenesRoutes.js    # 场景路由
│   │   ├── uploadRoutes.js    # 上传路由
│   │   ├── creditsRoutes.js   # 积分路由
│   │   └── adminRoutes.js     # 管理员路由
│   ├── services/        # 业务服务
│   │   ├── n8nService.js      # n8n集成
│   │   ├── websocket.js       # WebSocket
│   │   └── creditService.js   # 积分系统
│   ├── utils/           # 工具函数
│   │   ├── wechat.js    # 微信API
│   │   └── upload.js    # 文件上传
│   ├── workers/         # 队列Worker
│   │   └── taskWorker.js # 任务处理器
│   └── app.js           # 应用入口
├── uploads/             # 上传文件目录
├── .env                 # 环境变量
├── .env.example         # 环境变量模板
├── .gitignore
├── package.json
└── README.md
```

## 🔌 API接口

### 认证相关

- `POST /api/auth/wechat/login` - 微信小程序登录
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/admin/login` - 管理员登录
- `POST /api/auth/refresh` - 刷新Token

### 作品管理

- `GET /api/works` - 获取作品列表
- `GET /api/works/:work_id` - 获取作品详情
- `PUT /api/works/:work_id` - 更新作品
- `DELETE /api/works/:work_id` - 删除作品
- `POST /api/works/batch/delete` - 批量删除作品

### 任务管理

- `POST /api/tasks/create` - 创建任务
- `GET /api/tasks/:task_id` - 获取任务状态
- `GET /api/tasks/user/list` - 获取用户任务列表
- `POST /api/tasks/:task_id/cancel` - 取消任务
- `GET /api/tasks/stats/queue` - 获取队列统计

### 场景管理

- `GET /api/scenes` - 获取场景列表
- `GET /api/scenes/:scene_id` - 获取场景详情
- `POST /api/scenes` - 创建场景（管理员）
- `PUT /api/scenes/:scene_id` - 更新场景（管理员）
- `DELETE /api/scenes/:scene_id` - 删除场景（管理员）

### 文件上传

- `POST /api/upload/single` - 上传单个文件
- `POST /api/upload/multiple` - 上传多个文件
- `POST /api/upload/base64` - Base64上传
- `POST /api/upload/base64/batch` - 批量Base64上传
- `DELETE /api/upload/:fileName` - 删除文件

### 积分管理

- `GET /api/credits/balance` - 获取积分余额
- `GET /api/credits/records` - 获取积分记录
- `GET /api/credits/stats` - 获取积分统计
- `GET /api/credits/packages` - 获取充值套餐
- `POST /api/credits/recharge` - 创建充值订单
- `GET /api/credits/orders` - 获取订单列表

### 管理员接口

- `GET /api/admin/stats/overview` - 系统统计概览
- `GET /api/admin/users` - 用户列表
- `PUT /api/admin/users/:user_id` - 更新用户
- `GET /api/admin/works` - 作品列表
- `GET /api/admin/tasks` - 任务列表
- `GET /api/admin/orders` - 订单列表
- `GET /api/admin/config` - 系统配置
- `PUT /api/admin/config/:config_key` - 更新配置

### 系统接口

- `GET /health` - 健康检查
- `POST /api/callback/task-complete` - 任务完成回调（供n8n调用）
- `POST /api/callback/task-failed` - 任务失败回调（供n8n调用）

### WebSocket接口

- `WS /ws` - WebSocket连接
  - 认证: `{"type": "auth", "token": "jwt_token"}`
  - 心跳: `{"type": "ping"}`
  - 接收: 任务进度、任务完成、任务失败通知

## 🔐 认证方式

所有需要认证的接口都使用JWT Bearer Token：

```bash
Authorization: Bearer <jwt_token>
```

管理员接口需要用户角色为 `admin`。

## 🛠️ 开发说明

### 添加新路由

1. 在 `src/routes/` 创建路由文件
2. 在 `src/app.js` 中导入并注册路由

### 添加中间件

1. 在 `src/middleware/` 创建中间件文件
2. 在路由中使用

### 数据库操作

```javascript
const { query } = require('../config/database');

// 查询
const users = await query('SELECT * FROM users WHERE user_id = ?', [userId]);

// 事务
const { transaction } = require('../config/database');
await transaction(async (connection) => {
  // 在事务中执行操作
});
```

### Redis缓存

```javascript
const { cacheHelper } = require('../config/redis');

// 设置缓存
await cacheHelper.set('key', value, 3600);

// 获取缓存
const value = await cacheHelper.get('key');

// 删除缓存
await cacheHelper.del('key');
```

### 队列任务

```javascript
const { addJob } = require('../config/queue');

// 添加任务到队列
await addJob('fitting', {
  task_id: 'xxx',
  user_id: 'xxx',
  // ...其他参数
});
```

### WebSocket推送

```javascript
const { sendToUser, sendTaskProgress } = require('../services/websocket');

// 发送消息给用户
sendToUser(userId, { type: 'notification', message: 'xxx' });

// 发送任务进度
sendTaskProgress(userId, taskId, 50, '处理中...');
```

## 📊 监控和日志

### PM2监控

```bash
pm2 monit                # 实时监控
pm2 logs ai-photo-backend # 查看日志
pm2 status               # 查看状态
```

### 日志位置

- 开发环境: 控制台输出
- 生产环境: PM2日志目录 `~/.pm2/logs/`

## 🚨 常见问题

### 数据库连接失败

- 检查MySQL是否启动
- 检查 `.env` 中的数据库配置
- 检查数据库用户权限

### Redis连接失败

- 检查Redis是否启动
- 检查 `.env` 中的Redis配置
- Redis不可用时，缓存功能会降级，不影响核心功能

### n8n调用失败

- 检查n8n服务是否启动
- 检查 `.env` 中的n8n webhook地址
- 查看n8n工作流日志

### WebSocket连接断开

- 检查防火墙设置
- 检查Nginx配置（如果使用反向代理）
- 确保客户端正确处理重连

## 📝 许可证

MIT

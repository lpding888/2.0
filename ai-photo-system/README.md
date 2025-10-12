# AI摄影系统 - 完整解决方案

基于Node.js + Express + MySQL + Redis + n8n + Next.js构建的完整AI摄影系统，支持试衣间、摄影生成、旅行照片等功能，包含批量处理、实时进度、视频相册等高级特性。

## 🎯 项目概述

将微信小程序AI摄影系统从云开发迁移到自建服务器，实现成本优化和功能增强。

### 核心优势

- ✅ **成本降低**: 从按量付费到固定成本（¥100-200/月）
- ✅ **批量生成**: 支持1-50张图片批量生成
- ✅ **实时进度**: WebSocket实时推送生成进度
- ✅ **高并发**: Bull队列 + Redis支持高并发处理
- ✅ **灵活扩展**: n8n可视化工作流，易于调整
- ✅ **多端支持**: 小程序 + 网页版完整功能

## 📁 项目结构

```
ai-photo-system/
├── database/                 # 数据库
│   └── init.sql             # 初始化SQL（10张表）
│
├── backend/                  # 后端API服务
│   ├── src/
│   │   ├── config/          # 配置（数据库、Redis、队列）
│   │   ├── middleware/      # 中间件（认证、验证、错误处理）
│   │   ├── routes/          # API路由（8个模块）
│   │   ├── services/        # 业务服务（n8n、WebSocket、积分）
│   │   ├── utils/           # 工具函数
│   │   ├── workers/         # 队列Worker
│   │   └── app.js           # 应用入口
│   ├── package.json
│   └── README.md
│
├── n8n-workflows/            # n8n工作流配置
│   ├── fitting-batch.json   # 试衣间批量生成
│   ├── photography-batch.json # 摄影批量生成
│   ├── notification.json    # 消息通知
│   └── README.md
│
├── admin/                    # 管理后台
│   ├── assets/
│   │   ├── css/            # 样式
│   │   └── js/             # 公共JS
│   ├── index.html          # 仪表板
│   ├── login.html          # 登录页
│   ├── users.html          # 用户管理
│   ├── works.html          # 作品管理
│   ├── tasks.html          # 任务监控
│   └── README.md
│
├── web/                      # 网页版（完整功能）
│   ├── pages/              # Next.js页面
│   ├── components/         # React组件
│   ├── lib/                # 工具库（API、WebSocket、状态管理）
│   ├── styles/             # 样式
│   ├── package.json
│   └── README.md
│
├── deploy/                   # 部署脚本
│   ├── deploy.sh           # 一键部署脚本
│   ├── nginx.conf          # Nginx配置示例
│   └── ecosystem.config.js # PM2配置
│
└── README.md                # 总文档（本文件）
```

## 🚀 快速开始

### 环境要求

- **服务器**: 4核4G（推荐腾讯云轻量应用服务器）
- **操作系统**: Ubuntu 20.04+ / CentOS 7+
- **Node.js**: >= 18.0.0
- **MySQL**: >= 8.0
- **Redis**: >= 7.0
- **Nginx**: 最新稳定版
- **n8n**: 最新版

### 自动部署（推荐）

```bash
# 1. 上传项目到服务器
scp -r ai-photo-system root@43.139.187.166:/root/

# 2. SSH登录服务器
ssh root@43.139.187.166

# 3. 运行一键部署脚本
cd /root/ai-photo-system/deploy
chmod +x deploy.sh
./deploy.sh
```

### 手动部署

#### 1. 数据库初始化

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE ai_photo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入初始化SQL
mysql -u ai_photo -p ai_photo < database/init.sql
```

#### 2. 后端API部署

```bash
cd backend

# 安装依赖
npm install --production

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 启动服务（PM2）
pm2 start src/app.js --name ai-photo-backend
pm2 save
pm2 startup
```

#### 3. n8n配置

```bash
# 安装n8n
npm install -g n8n

# 启动n8n
n8n start

# 访问 http://localhost:5678
# 导入工作流: n8n-workflows/*.json
# 配置环境变量和API Key
```

#### 4. 管理后台部署

```bash
# 复制到Web目录
cp -r admin /var/www/ai-photo-admin

# 修改API地址
nano /var/www/ai-photo-admin/assets/js/common.js
# 修改 API_BASE_URL
```

#### 5. 网页版部署

```bash
cd web

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
nano .env.local  # 编辑配置

# 构建
npm run build

# 启动（PM2）
pm2 start npm --name ai-photo-web -- start
pm2 save
```

#### 6. Nginx配置

```bash
# 复制配置文件
cp deploy/nginx.conf /etc/nginx/sites-available/ai-photo

# 修改域名和路径
nano /etc/nginx/sites-available/ai-photo

# 启用站点
ln -s /etc/nginx/sites-available/ai-photo /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl reload nginx
```

## 📊 系统架构

```
┌─────────────┐
│ 微信小程序   │
└──────┬──────┘
       │
       ├─────────────┐
       │             │
┌──────▼──────┐ ┌───▼────────┐
│  网页版      │ │  管理后台   │
│ (Next.js)    │ │ (HTML)     │
└──────┬──────┘ └───┬────────┘
       │            │
       └────┬───────┘
            │
     ┌──────▼───────┐
     │  后端API      │
     │  (Express)    │
     └──────┬───────┘
            │
     ┌──────┴───────┐
     │              │
┌────▼─────┐  ┌────▼─────┐
│  n8n     │  │  MySQL   │
│ 工作流    │  │  Redis   │
└────┬─────┘  └──────────┘
     │
┌────▼──────┐
│  AI API   │
│ (kuai.host)│
└───────────┘
```

### 数据流程

1. **用户请求** → 小程序/网页版
2. **API调用** → 后端验证Token、扣除积分
3. **创建任务** → 写入MySQL，加入Bull队列
4. **Worker处理** → 调用n8n webhook
5. **n8n执行** → 调用AI API生成图片
6. **回调更新** → n8n回调后端更新状态
7. **实时推送** → WebSocket通知用户
8. **结果展示** → 用户查看生成结果

## 🔧 配置说明

### 后端配置 (backend/.env)

```bash
# 数据库
DB_HOST=localhost
DB_USER=ai_photo
DB_PASSWORD=Canbp3dFb5yPG28w
DB_NAME=ai_photo

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# 微信小程序
WECHAT_APP_ID=wx1ed34a87abfaa643
WECHAT_APP_SECRET=your-app-secret

# n8n
N8N_WEBHOOK_BASE_URL=http://localhost:5678/webhook
```

### n8n配置

环境变量：
```bash
AI_API_URL=https://apis.kuai.host/v1beta/models/gemini-2.5-flash-image-preview:generateContent
AI_API_KEY=sk-YOUR-API-KEY
BACKEND_URL=localhost:3000
```

## 📈 性能优化

### 1. 数据库优化

- ✅ 所有表添加索引
- ✅ 分页查询优化
- ✅ 连接池配置

### 2. 缓存策略

- ✅ Redis缓存热门数据
- ✅ 场景数据缓存1小时
- ✅ AccessToken缓存

### 3. 并发处理

- ✅ Bull队列并发数可配置
- ✅ 支持多Worker实例
- ✅ 任务优先级队列

### 4. 成本优化

- ✅ 图片结果缓存7天
- ✅ 相同参数命中缓存
- ✅ 预计节省30%成本

## 🔒 安全措施

- ✅ JWT Token认证
- ✅ API限流（1000次/15分钟）
- ✅ SQL注入防护
- ✅ XSS防护
- ✅ HTTPS加密（生产环境）
- ✅ 管理员权限控制

## 📱 功能清单

### 后端API
- ✅ 用户认证（微信登录、JWT）
- ✅ 作品管理（CRUD、批量操作）
- ✅ 任务管理（创建、查询、取消）
- ✅ 场景管理（列表、分类）
- ✅ 文件上传（单个、批量、Base64）
- ✅ 积分系统（充值、消费、记录）
- ✅ 订单管理（支付、查询）
- ✅ 管理员功能（统计、管理）
- ✅ WebSocket（实时进度推送）

### n8n工作流
- ✅ 试衣间批量生成
- ✅ 摄影批量生成
- ✅ 旅行照片生成
- ✅ 消息通知（WebSocket、邮件）

### 管理后台
- ✅ 仪表板（统计数据）
- ✅ 用户管理（查询、编辑、积分调整）
- ✅ 作品管理（查看、删除）
- ✅ 任务监控（实时状态）
- ✅ 场景管理（CRUD）
- ✅ 订单管理（查询、统计）
- ✅ 系统配置（参数设置）

### 网页版
- ✅ 微信扫码登录
- ✅ AI生成工作室（批量上传10-20张）
- ✅ 实时进度显示
- ✅ 作品列表（瀑布流）
- ✅ 批量下载（ZIP打包）
- ✅ 视频相册生成（FFmpeg）
- ✅ 积分充值
- ✅ 个人中心

## 🔍 监控和维护

### 查看日志

```bash
# 后端日志
pm2 logs ai-photo-backend

# 网页版日志
pm2 logs ai-photo-web

# Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 查看状态

```bash
# PM2服务状态
pm2 status

# 数据库状态
systemctl status mysql

# Redis状态
systemctl status redis

# Nginx状态
systemctl status nginx
```

### 数据库备份

```bash
# 手动备份
mysqldump -u ai_photo -p ai_photo > backup_$(date +%Y%m%d).sql

# 定时备份（crontab）
0 2 * * * mysqldump -u ai_photo -p'password' ai_photo > /backup/ai_photo_$(date +\%Y\%m\%d).sql
```

## 🐛 故障排查

### 后端无法启动

1. 检查.env配置
2. 检查数据库连接
3. 检查Redis连接
4. 查看PM2日志

### n8n调用失败

1. 检查n8n服务状态
2. 检查webhook地址配置
3. 检查AI API Key
4. 查看n8n执行日志

### WebSocket连接失败

1. 检查防火墙设置
2. 检查Nginx WebSocket配置
3. 检查后端WebSocket服务

## 📞 技术支持

- **文档**: 查看各模块README.md
- **问题反馈**: 提交Issue

## 📝 开发日志

### 2024-10-12 v1.0.0

- ✅ 完成数据库设计（10张表）
- ✅ 完成后端API（8个模块，30+接口）
- ✅ 完成n8n工作流配置（3个工作流）
- ✅ 完成管理后台（7个页面）
- ✅ 完成网页版（完整功能）
- ✅ 完成部署脚本和文档
- ✅ 完成整体测试

## 📄 许可证

MIT License

## 🎉 致谢

感谢所有开源项目：
- Next.js
- Express
- n8n
- Bull
- Socket.io
- Tailwind CSS
- 以及其他依赖库

---

**部署完成后，记得：**
1. ✅ 修改默认管理员密码
2. ✅ 配置WECHAT_APP_SECRET
3. ✅ 配置n8n API Key
4. ✅ 配置域名和HTTPS
5. ✅ 设置数据库定时备份

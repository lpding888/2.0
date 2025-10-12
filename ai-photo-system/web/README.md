# AI摄影系统 - 网页版（完整功能）

基于Next.js + React + TypeScript的完整功能网页版，支持批量上传、实时进度、批量下载、视频相册等功能。

## ✨ 核心功能

### 🎨 AI生成工作室
- **批量上传**: 支持拖拽上传10-20张图片
- **多种生成模式**: 试衣间、摄影、旅行照片
- **场景选择**: 丰富的场景库
- **实时进度**: WebSocket实时推送生成进度
- **参数调整**: 自定义生成参数

### 📸 作品管理
- **作品列表**: 瀑布流展示
- **分类筛选**: 按类型、状态筛选
- **批量操作**: 选择多个作品批量下载/删除
- **作品详情**: 高清预览、参数查看
- **收藏功能**: 收藏喜欢的作品

### 📦 批量下载
- **ZIP打包**: 自动打包选中作品为ZIP
- **命名规则**: 智能命名（时间戳+类型）
- **下载进度**: 显示打包和下载进度

### 🎬 视频相册生成
- **自动剪辑**: 将多张照片生成视频相册
- **模板选择**: 多种视频模板
- **背景音乐**: 内置多首背景音乐
- **自定义时长**: 每张图片显示时长可调

### 💰 积分系统
- **余额查看**: 实时显示积分余额
- **充值功能**: 多种充值套餐
- **消费记录**: 详细的积分流水

### 🔐 微信扫码登录
- **小程序码登录**: 生成小程序码扫码登录
- **自动同步**: 与小程序数据同步

## 🚀 快速开始

### 安装依赖

```bash
cd web
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local`:

```bash
API_BASE_URL=http://localhost:3000/api
WS_URL=ws://localhost:3000
NEXT_PUBLIC_WECHAT_APP_ID=your_wechat_appid
```

### 开发模式

```bash
npm run dev
```

访问: http://localhost:3001

### 生产构建

```bash
npm run build
npm start
```

### 静态导出（可选）

```bash
npm run export
```

## 📁 项目结构

```
web/
├── pages/                    # 页面
│   ├── _app.tsx             # App入口
│   ├── index.tsx            # 首页
│   ├── login.tsx            # 登录页
│   ├── studio.tsx           # AI生成工作室
│   ├── works/               # 作品相关
│   │   ├── index.tsx        # 作品列表
│   │   └── [id].tsx         # 作品详情
│   ├── profile.tsx          # 个人中心
│   └── credits.tsx          # 积分中心
├── components/              # 组件
│   ├── Layout.tsx           # 布局组件
│   ├── Header.tsx           # 顶部导航
│   ├── UploadZone.tsx       # 上传组件
│   ├── ImageGrid.tsx        # 图片网格
│   ├── TaskProgress.tsx     # 任务进度
│   ├── BatchDownload.tsx    # 批量下载
│   └── VideoAlbum.tsx       # 视频相册
├── lib/                     # 工具库
│   ├── api.ts               # API封装
│   ├── websocket.ts         # WebSocket管理
│   ├── store.ts             # 状态管理
│   └── utils.ts             # 工具函数
├── styles/                  # 样式
│   └── globals.css          # 全局样式
├── public/                  # 静态资源
├── next.config.js           # Next.js配置
├── tailwind.config.js       # Tailwind配置
├── tsconfig.json            # TypeScript配置
└── package.json             # 依赖配置
```

## 🎯 核心组件说明

### UploadZone - 批量上传组件

支持拖拽上传、点击上传、预览、进度显示：

```tsx
import UploadZone from '@/components/UploadZone';

<UploadZone
  maxFiles={20}
  onFilesSelected={(files) => console.log(files)}
  accept="image/jpeg,image/png"
/>
```

### TaskProgress - 任务进度组件

实时显示任务进度（WebSocket）：

```tsx
import TaskProgress from '@/components/TaskProgress';

<TaskProgress
  taskId={taskId}
  onComplete={(result) => console.log('完成', result)}
  onError={(error) => console.log('失败', error)}
/>
```

### BatchDownload - 批量下载组件

将多个作品打包成ZIP下载：

```tsx
import BatchDownload from '@/components/BatchDownload';

<BatchDownload
  workIds={selectedWorkIds}
  filename="my-works.zip"
/>
```

### VideoAlbum - 视频相册生成

将照片生成视频相册：

```tsx
import VideoAlbum from '@/components/VideoAlbum';

<VideoAlbum
  images={imageUrls}
  template="classic"
  music="gentle"
  duration={3}
  onComplete={(videoUrl) => console.log(videoUrl)}
/>
```

## 🔌 API调用示例

```typescript
import { worksAPI, tasksAPI, uploadAPI } from '@/lib/api';

// 获取作品列表
const works = await worksAPI.getWorks({ page: 1, pageSize: 20 });

// 创建任务
const task = await tasksAPI.createTask({
  type: 'fitting',
  images: ['base64...'],
  batch_count: 10
});

// 上传文件
const result = await uploadAPI.uploadMultiple(files, (progress) => {
  console.log(`上传进度: ${progress}%`);
});
```

## 🌐 WebSocket使用

```typescript
import { wsManager } from '@/lib/websocket';

// 监听任务进度
wsManager.on('task_progress', (data) => {
  console.log(`进度: ${data.progress}%`);
});

// 监听任务完成
wsManager.on('task_complete', (data) => {
  console.log('任务完成:', data.result);
});
```

## 🎨 样式定制

项目使用Tailwind CSS，可在 `tailwind.config.js` 中自定义主题：

```javascript
theme: {
  extend: {
    colors: {
      primary: '#4A90E2',
      secondary: '#50C878',
    },
  },
}
```

## 📱 响应式设计

全站支持响应式布局：

- **桌面端**: 1200px+ 完整功能
- **平板**: 768px-1199px 优化布局
- **手机**: <768px 移动端适配

## 🔒 安全性

- **JWT认证**: 所有API请求需要Token
- **HTTPS**: 生产环境使用HTTPS
- **XSS防护**: React自动转义
- **CSRF防护**: API Token验证

## ⚡ 性能优化

- **代码分割**: Next.js自动代码分割
- **图片优化**: Next.js Image组件优化
- **懒加载**: 路由级懒加载
- **缓存策略**: API响应缓存

## 🐛 常见问题

### WebSocket连接失败

检查WS_URL配置，确保后端WebSocket服务运行正常。

### 文件上传失败

检查文件大小限制（默认10MB），后端上传配置。

### 批量下载打包慢

大量图片打包需要时间，显示进度条提示用户等待。

### 视频生成失败

视频生成需要FFmpeg支持，确保服务器已安装FFmpeg。

## 📊 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 部署

### Vercel部署（推荐）

```bash
npm install -g vercel
vercel
```

### 自建服务器

```bash
# 构建
npm run build

# 使用PM2启动
pm2 start npm --name "ai-photo-web" -- start

# 或使用Nginx反向代理
# 配置Nginx指向 http://localhost:3001
```

### Docker部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

## 📝 开发日志

- 2024-10-12: v1.0.0 初始版本发布
  - 完整功能实现
  - 批量上传/下载
  - 实时进度推送
  - 视频相册生成

## 📄 许可证

MIT License

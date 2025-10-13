# AI摄影师 · 开发者README

本仓库包含：
- 微信小程序前端（`miniprogram/`）与云函数（`cloudfunctions/`）
- 后端服务（Express，`ai-photo-system/backend/`）与 Web 站点（Next.js，`ai-photo-system/web/`）
- 运维与辅助脚本（`scripts/`）与工作流（`n8n-workflows/`）

## 项目简介

AI服装摄影与虚拟试衣，面向电商卖家、设计师与个人用户：
- 电商：快速生成多场景商品图，提升转化
- 设计：低成本展示作品
- 个人：虚拟试衣，查看上身效果

### 技术特性

- Serverless 架构：微信云开发 + 云函数
- Fire-and-Forget：主流程快速返回，Worker 异步执行
- 并发安全：数据库原子加减与任务状态机
- 预热机制：定时 ping 降低冷启动延迟
- 智能缓存：5 分钟 TTL 缓存（命中优先，失效回源）
- iOS 支付限制：检测后引导合规路径

## 核心功能

1) AI 服装摄影：上传服装图，选择场景与模特参数，自动生成成片（`miniprogram/pages/photography/` + `cloudfunctions/photography*`）
2) AI 虚拟试衣：人物照 + 服装图合成，上身效果（`miniprogram/pages/fitting*/` + `cloudfunctions/fitting*`）
3) 姿势裂变：保持服装与场景，仅变更姿势（`miniprogram/pages/work-detail/` + `cloudfunctions/photography`）
4) 作品管理与分享：收藏/删除/海报水印（`miniprogram/pages/works*/` + `cloudfunctions/api`）
5) 积分系统：注册/签到/邀请/充值/消费（`miniprogram/pages/credits*`,`cloudfunctions/payment`,`cloudfunctions/user`）

## 云函数概览（当前 22 个）

核心：`user` `api` `payment` `photography` `fitting`

Workers：`photography-worker` `fitting-worker`

辅助：`scene` `prompt` `storage` `aimodels` `auth` `task-processor` `database-init` `debug-scenes` `force-admin` `ai-stylist` `ai-callback` `tencent-ci-matting` `personal` `personal-worker`

## 异步模式（Fire-and-Forget）

用户请求 → 主函数扣积分/落库/投递任务 → 立即返回 → Worker 异步生成 → 更新作品与任务状态 → 前端轮询或刷新查看结果。
要点：主函数仅对“真实失败”退款；Worker 内部失败触发退款；超时不自动退款以避免误判。

## 数据库设计（核心集合）

`users` `works` `task_queue` `credit_records` `orders`（更多集合视具体模块扩展）。

## 快速开始（本地与云端）

### 环境要求

- `WeChat DevTools`：最新稳定版
- `Node.js`：建议使用 18 LTS（backend/web 需 >=18；云函数当前多为 Node 16）
- `Cloudbase`：已开通云开发环境（envId 配置）

### 本地开发（核心路径）

1. 配置云环境
   - 微信开发者工具导入根目录；`miniprogram/app.json` 中 `cloud: true`
   - 如需切换 envId，可在 `miniprogram/app.js` 与 `cloudbaserc.json` 调整（避免在文档或提交中泄露真实 ID）

2. 安装云函数依赖（每个函数）
   - 在对应 `cloudfunctions/<name>/` 目录执行 `npm i`

3. 部署云函数
   - 推荐使用脚本：`scripts/deploy/deploy-cloudfunctions.ps1`

4. （可选）运行后端与 Web
   - Backend：`cd ai-photo-system/backend && npm i && npm run dev`
   - Web：`cd ai-photo-system/web && npm i && npm run dev`

### 运行与测试

- 小程序：微信开发者工具预览/真机调试
- 云函数联调：`miniprogram/utils/api.js` 封装的 `wx.cloud.callFunction`
- 脚本测试：`scripts/test/*`（如 `test-payment-flow.js`）

## 目录结构

```
.
├─ miniprogram/            # 小程序前端
├─ cloudfunctions/         # 云函数（22 个）
├─ ai-photo-system/
│  ├─ backend/            # Express 后端
│  └─ web/                # Next.js Web 站点
├─ n8n-workflows/          # n8n 工作流与容器编排
├─ scripts/                # 部署/调试/修复/初始化脚本
└─ docs/                   # 文档与清单
```

## 常见任务

- 部署全部云函数：`scripts/deploy/deploy-cloudfunctions.ps1`
- 部署 Workers：`scripts/deploy/deploy-workers.ps1`
- 初始化集合与模板：`scripts/setup/*`
- 调试与排障：`scripts/debug/*`

## FAQ

- iOS 支付：小程序内遵循合规限制，需引导到合规路径进行充值/购买
- 冷启动：已启用定时 `ping` 预热，建议避开高峰首次调用
- 缓存：默认 5 分钟 TTL，命中优先；生成后主动失效相关键


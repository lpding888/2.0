# 开发指南（本地与联调）

## 本地环境
- Node.js：推荐 18 LTS（backend/web 需 >=18；云函数多为 Node 16）
- WeChat DevTools：最新稳定版
- Cloudbase：已开通云环境

## 小程序与云函数
- 导入根目录到微信开发者工具（`miniprogram/app.json` 中 `cloud: true`）。
- envId：如需切换，可在 `miniprogram/app.js` 与 `cloudbaserc.json` 同步调整。
- 云函数依赖：在各 `cloudfunctions/<name>/` 执行 `npm i`。
- 部署：`scripts/deploy/deploy-cloudfunctions.ps1`（或分模块脚本）。

## 后端与 Web（可选）
- Backend（Express）：
  - `cd ai-photo-system/backend && npm i && npm run dev`
  - 环境键名见 `.env.example`（仅列出名称，不提交真实值）。
- Web（Next.js）：
  - `cd ai-photo-system/web && npm i && npm run dev`

## Lint/Format & 提交
- Lint（backend/web）：`npm run lint`
- 约定式提交（建议）：`feat/fix/docs/chore/refactor/test/build` 前缀，保持小写动词+范围

## 运行小程序
- 预览/真机调试：微信开发者工具
- 云函数调用：统一通过 `miniprogram/utils/api.js`（封装 loading/重试/错误处理）

## 日志与追踪
- 小程序：生产态默认关闭 `console.log`，仅保留错误日志
- 云函数：`console.error` 记录关键错误；API 标准响应 `{ success, message }`
- 后端：可选 Sentry（见 `.env.example` 键名），Winston 滚动日志

## 常见问题排查
- 冷启动：已启用定时 `ping`；建议避开首次调用高峰
- 权限：管理员通过 `admin_users` 集合与 `auth` 函数校验
- 任务不更新：检查 `task_queue` 与 `*-worker` 日志；确认退款逻辑仅对真实失败触发
- 依赖问题：逐函数安装依赖；Node 版本按模块要求（云函数16，后端/web 18）


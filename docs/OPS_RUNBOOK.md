# 运行手册（OPS）

- 部署对象：云函数（主/辅/Worker）、（可选）后端与 Web、n8n 容器

## 部署清单
- 云函数依赖安装：逐函数 `npm i`
- 云函数部署：`scripts/deploy/deploy-cloudfunctions.ps1`（或分模块）
- Workers 部署：`scripts/deploy/deploy-workers.ps1`
- （可选）Backend/Web：各自目录 `npm run build/start`
- （可选）n8n/服务容器：`n8n-workflows/docker-compose.yml`

## 环境变量（仅列名）
- Backend（示例键名）：`PORT` `NODE_ENV` `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` `REDIS_HOST` `REDIS_PORT` `JWT_SECRET` `JWT_EXPIRES_IN` `WECHAT_APP_ID` `WECHAT_APP_SECRET` `N8N_WEBHOOK_BASE_URL` `AI_API_URL` `AI_API_KEY_*` `SENTRY_*`
- Web：见 `ai-photo-system/web/.env.example`
- 小程序/云函数：envId 在 `miniprogram/app.js` 与 `cloudbaserc.json`（避免泄露真实值）

## 密钥轮换/保密
- 仅提交 `.env.example`/`.env.template`（列出键名与用途，不含真实值）
- 轮换流程：新旧并存 → 验证 → 切换 → 清理旧值
- 小程序端避免硬编码敏感配置

## 回滚
- 云函数：按函数为单位回滚到上一版本（或重发上个稳定包）
- Backend/Web：保留上一构建产物与镜像标签；蓝绿或灰度切换
- 数据：DDL 变更先影子表或向后兼容脚本

## 冒烟/健康检查
- `api.ping`：云函数健康检查
- 生成流程：发起 photography/fitting，确认队列落库与状态更新
- 支付：下单→回调→幂等校验
- Worker：检查日志与生成图上传

## 监控与告警
- 云函数错误日志聚合；失败任务阈值告警
- Backend：Sentry/Winston 滚动日志；重要接口Rate/Latency


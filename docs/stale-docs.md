# 失效/冲突文档清单

- file: CLAUDE.md:12
  claim: "Use PowerShell scripts in root directory (e.g., `deploy-cloudfunctions.ps1`)"
  what’s wrong: 实际脚本位于 `scripts/deploy/deploy-cloudfunctions.ps1`，而非仓库根目录。
  evidence: CLAUDE.md:12, scripts/README.md, scripts/deploy/deploy-cloudfunctions.ps1
  suggested fix: 将路径改为 `scripts/deploy/deploy-cloudfunctions.ps1`，并统一文档内所有脚本路径前缀为 `scripts/`。

- file: CLAUDE.md:128
  claim: "Debug mode is enabled in `app.json` (debug: true)"
  what’s wrong: 目前 `miniprogram/app.json` 中为 `"debug": false`。
  evidence: CLAUDE.md:128, miniprogram/app.json:74
  suggested fix: 更新说明为“默认关闭 debug 模式”，或给出在开发态开启 debug 的操作步骤。

- file: README.md:117
  claim: "云函数列表(16)"
  what’s wrong: 现有云函数目录为 22 个（如 `ai-callback`, `personal`, `task-processor` 等）。
  evidence: README.md:117, cloudfunctions/ 目录清单
  suggested fix: 将数量更新为实际目录数，并补齐清单描述。

- file: README.md:308
  claim: "Node.js v14+ (用于云函数开发)"
  what’s wrong: `ai-photo-system/backend` 与 `ai-photo-system/web` 的 engines 为 Node >=18；cloudfunctions 大多运行在 Node 16，一些 package.json 仍声明 Nodejs14.18，存在版本不一致。
  evidence: README.md:308, ai-photo-system/backend/package.json, ai-photo-system/web/package.json, cloudbaserc.json:8, cloudfunctions/fitting/package.json:11
  suggested fix: 统一约定：本地与服务端推荐 Node 18 LTS；云函数运行时统一为 Node 16（或升级到 18），清理 package.json 中历史的 Nodejs14.18 标注。

- file: README.md（整体范围）
  claim: 仅描述了小程序与云函数，未覆盖 `ai-photo-system/backend`、`ai-photo-system/web` 与 `n8n-workflows`。
  what’s wrong: 仓库已包含 Web 前端、后端与 n8n 工作流/容器配置。
  evidence: ai-photo-system/*, n8n-workflows/* 存在
  suggested fix: 在 README 与架构文档中增补 backend/web 与 n8n 的角色、启动与部署说明。


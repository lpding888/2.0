# API/功能面清单

说明：以下仅罗列在仓库中可直接调用的云函数/脚本与已见到的 `action`，更细参数以代码为准；未能确认的细节以 “Assumption:” 标注。

## 云函数（入口与动作）

### api（cloudfunctions/api/index.js）
- 鉴权：默认需要 OPENID；NAS 专用接口需密钥头 `x-nas-secret`
- 公共动作：
  - `ping` → 健康检查
  - `listWorks({ tab, onlyCompleted, pageSize, last_id, last_created_at })` → 作品列表
  - `getWorkDetail({ work_id })` → 作品详情
  - `deleteWork({ work_id })` → 删除作品
  - `toggleFavorite({ work_id, value? })` → 收藏开关
  - `updateWorkTitle({ work_id, title })` / `updateWork({...})` → 更新作品
  - `getUserStats()` → 用户统计
  - `updateUserPreferences({ ... })` → 偏好设置
- 管理动作：
  - `getUsers({ ...filters })` `updateUserStatus({ ... })` `getStatistics()` `exportData()`
- NAS 专用（需密钥）：`getPendingTasks` `getTempFileURLs` `uploadGeneratedImage` `nasCallback`
- 响应格式：`{ success: boolean, data?: any, message?: string }`

### photography / fitting（主流程）
- 输入：上传图信息、参数（场景/模特/姿势等）
- 输出：`{ success, task_id, work_id }`（快速返回）
- 行为：扣积分、落库（works/task_queue）、异步触发 `*-worker`
  - Assumption: 失败时记录错误；真实失败触发退款

### photography-worker / fitting-worker（执行）
- 输入：`task_id` 与素材位置
- 输出：更新 `works` 与 `task_queue` 状态并上传生成图
- 超时：不触发退款（避免误判）

### payment
- 动作：充值订单、套餐管理、回调
- 要求：支付回调幂等；重放/签名校验（详见安全清单）

### 其他函数
- `user`：注册/登录/积分查询
- `scene`/`prompt`：场景与提示词管理
- `storage`：去重/临时链接
- `aimodels`：AI 模型配置与密钥轮换
- `auth`：权限校验
- `task-processor`：任务处理
- `database-init`/`debug-scenes`/`force-admin`/`ai-stylist`/`ai-callback`/`tencent-ci-matting`/`personal`/`personal-worker`

## CLI/脚本
- 部署：`scripts/deploy/deploy-cloudfunctions.ps1`、`scripts/deploy/deploy-workers.ps1`
- 初始化：`scripts/setup/*`（集合/模板/模型/环境变量）
- 调试与修复：`scripts/debug/*`、`scripts/fix/*`
- 测试：`scripts/test/*`（`test-payment-flow.js`、`test-simplified-api.js` 等）

## 示例调用
- 小程序（封装在 `miniprogram/utils/api.js`）
  - `wx.cloud.callFunction({ name: 'api', data: { action: 'listWorks', tab: 'all' } })`
  - `wx.cloud.callFunction({ name: 'photography', data: { ...params } })`


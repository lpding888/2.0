# 架构总览

- 形态：小程序前端 + 云函数（Serverless）+ 可选后端（Express）+ Web（Next.js）+ n8n 工作流
- 数据：Cloudbase/数据库集合（users, works, task_queue, credit_records, orders, ...）
- 队列：Bull（如在后端使用）/ 任务集合驱动，Worker 云函数异步执行
- 缓存：5 分钟 TTL（命中优先，生成/变更后主动失效相关键）
- 存储：云存储（生成图、临时URL、去重）
- 支付：支付云函数，iOS 合规约束（小程序内限制虚拟支付）

## 模块与数据流

1) 前端（miniprogram）
- UI/交互、参数收集、上传、任务发起、进度轮询
- 通过 `wx.cloud.callFunction` 调用 `api`/业务函数

2) API 入口（cloudfunctions/api）
- `action` 路由：`listWorks`, `getWorkDetail`, `deleteWork`, `toggleFavorite`, `updateWork(Title)`, `getUserStats`, `updateUserPreferences`
- NAS 专用接口（需密钥）：`getPendingTasks`, `getTempFileURLs`, `uploadGeneratedImage`, `nasCallback`
- 统一鉴权（OPENID），标准响应：`{ success, data?, message? }`

3) 任务调度
- `photography`/`fitting` 主函数接收请求：扣积分、落库（works/task_queue）、异步触发 `*-worker`
- 快速返回 `task_id`，前端轮询或刷新查看

4) Worker 执行
- 下载素材 → 调用外部 AI 服务 → 上传结果 → 更新 `works`/`task_queue`
- 失败：记录错误并退款（真实失败才退）

5) 支付与积分
- `payment` 管理充值与订单；`user` 维护积分、签到、邀请等
- iOS：检测后引导合规支付路径（不在小程序内直接虚拟支付）

## 队列/Workers

- 云函数级 Worker：`photography-worker`、`fitting-worker` 等
- 可选服务端队列（Express+Bull）：队列消费、并发控制、重试与死信

## 缓存策略（TTL 5 分钟）

- 查询热点：5 分钟 TTL；命中返回；未命中回源并写缓存
- 生成/变更：主动失效相关键（如作品列表、统计）
- 防穿透：失败短缓存；防击穿：随机抖动；防雪崩：过期错峰

## iOS 支付约束

- 检测设备平台；小程序内限制虚拟支付；需引导到合规路径
- 服务端回调需幂等（见安全清单），记录签名/重放保护

## 角色与权限

- 普通用户：作品/积分/个人信息
- 管理员：模型/场景/用户管理（`admin_users` 集合 + `auth` 函数校验）

## 错误处理

- 标准响应：`{ success, data?, message? }`
- 主流程：仅真实失败退款；超时不退以避免误判
- 记录：函数内部 `console.error` + 可选 Sentry（后端）


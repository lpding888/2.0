# NAS部署指南

## 部署流程总览

```
准备环境 → 配置密钥 → 部署服务 → 导入workflow → 测试验证
```

## 一、前置准备

### 1. 系统要求

- **硬件**：Intel G4560 (2核4线程) + 16GB RAM ✅
- **系统**：飞牛OS (Debian-based) ✅
- **软件**：Docker + Docker Compose ✅
- **网络**：IPv6 + DDNS ✅

### 2. 确认服务状态

登录NAS SSH，检查：

```bash
# 检查Docker
docker --version

# 检查Docker Compose
docker-compose --version

# 检查n8n
docker ps | grep n8n

# 检查端口占用
netstat -tuln | grep -E '7000|8080'
```

## 二、配置云函数

### 1. 设置环境变量

在微信云开发控制台配置环境变量：

```bash
# 云开发控制台 → 环境设置 → 环境变量
NAS_SECRET_KEY=请生成32位随机密钥
```

生成密钥：
```bash
# 在本地或NAS上运行
openssl rand -hex 16
```

### 2. 部署云函数

```powershell
# 在Windows本地运行
cd E:\2.0
.\deploy-cloudfunctions.ps1

# 或手动部署
cd cloudfunctions\api
npm install
cloudbase functions:deploy api
```

### 3. 验证API接口

使用Postman或curl测试：

```bash
# 测试ping接口
curl -X POST https://your-env.service.tcloudbase.com/api \
  -H "Content-Type: application/json" \
  -d '{"action": "ping"}'

# 测试getPendingTasks（需要密钥）
curl -X POST https://your-env.service.tcloudbase.com/api \
  -H "Content-Type: application/json" \
  -H "X-NAS-Secret: 你的密钥" \
  -d '{"action": "getPendingTasks", "limit": 1}'
```

## 三、部署NAS服务

### 1. 上传文件到NAS

```bash
# 方式1: 使用scp
scp -r n8n-workflows root@your-nas-ip:/root/

# 方式2: 使用飞牛OS文件管理器
# 通过Web界面上传 n8n-workflows 文件夹
```

### 2. SSH登录NAS

```bash
ssh root@your-nas-ip
cd /root/n8n-workflows
```

### 3. 配置环境变量

```bash
# 复制模板
cp .env.template .env

# 编辑环境变量
nano .env

# 填入以下内容：
# CLOUD_FUNCTION_URL=https://cloudbase-0gu1afji26f514d2.service.tcloudbase.com
# NAS_SECRET_KEY=上一步生成的32位密钥
# GEMINI_API_KEY=你的Gemini API密钥
# ENABLE_BG_REMOVAL=true
# REMBG_HOST=localhost

# 保存：Ctrl+X, Y, Enter
```

### 4. 启动服务

```bash
# 启动Rembg服务
docker-compose up -d rembg

# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f rembg

# 测试Rembg
curl http://localhost:7000
```

预期输出：
```json
{"message":"Welcome to Rembg API"}
```

## 四、配置n8n

### 1. 设置n8n环境变量

如果n8n在Docker中运行：

```bash
# 编辑n8n的docker-compose.yml
cd /path/to/n8n
nano docker-compose.yml

# 添加环境变量（或通过n8n Web界面设置）
environment:
  - CLOUD_FUNCTION_URL=https://cloudbase-0gu1afji26f514d2.service.tcloudbase.com
  - NAS_SECRET_KEY=你的密钥
  - GEMINI_API_KEY=你的Gemini_API密钥
  - ENABLE_BG_REMOVAL=true
  - REMBG_HOST=localhost
  - EXECUTIONS_TIMEOUT=-1

# 重启n8n
docker-compose restart n8n
```

如果n8n在飞牛OS应用商店安装：
- 通过n8n Web界面：Settings → Variables
- 逐个添加上述环境变量

### 2. 导入Workflow

1. 登录n8n Web界面（通常是 `http://nas-ip:5678`）
2. 点击右上角 "Import from File"
3. 选择 `/root/n8n-workflows/ai-photography-queue-processor.json`
4. 检查所有节点配置
5. 点击 "Save"

### 3. 激活Workflow

1. 在workflow编辑页面，右上角切换开关
2. 确认状态显示 "Active"
3. 查看 Executions 标签，确认有执行记录

## 五、测试验证

### 1. 手动触发测试

在n8n中：

```
1. 点击workflow中的 "每30秒触发" 节点
2. 点击 "Execute Node"
3. 查看输出结果
4. 检查是否成功获取任务
```

### 2. 端到端测试

在小程序中：

```
1. 上传服装图片
2. 选择拍摄场景
3. 点击生成
4. 等待120+秒
5. 查看生成结果
```

监控NAS日志：

```bash
# 查看n8n执行日志
docker logs -f n8n-container-name

# 查看Rembg日志
docker-compose logs -f rembg

# 查看云函数日志
# 在微信云开发控制台 → 云函数 → api → 日志
```

### 3. 验证检查清单

- [ ] Rembg服务正常运行（`docker ps | grep rembg`）
- [ ] n8n workflow已激活（Web界面显示Active）
- [ ] 环境变量正确配置（Settings → Variables）
- [ ] 云函数API可以访问（curl测试成功）
- [ ] 任务可以从pending变为nas_processing
- [ ] AI生成完成后回调成功
- [ ] 作品状态更新为completed

## 六、故障排查

### 问题1：n8n无法连接云函数

**症状**：
```
Error: connect ETIMEDOUT
```

**检查**：
```bash
# 1. 测试网络连通性
ping cloudbase-0gu1afji26f514d2.service.tcloudbase.com

# 2. 测试DNS解析
nslookup cloudbase-0gu1afji26f514d2.service.tcloudbase.com

# 3. 检查防火墙
iptables -L -n

# 4. 检查n8n容器网络
docker network inspect n8n_network
```

**解决**：
- 配置NAS出站防火墙规则
- 添加DNS服务器（8.8.8.8）
- 使用IPv6地址访问

### 问题2：NAS密钥认证失败

**症状**：
```json
{"success": false, "message": "NAS认证失败"}
```

**检查**：
```bash
# 1. 查看云函数环境变量
# 云开发控制台 → 环境设置 → 环境变量 → NAS_SECRET_KEY

# 2. 查看n8n环境变量
# n8n Web界面 → Settings → Variables → NAS_SECRET_KEY

# 3. 确认两者一致
```

**解决**：
- 重新生成密钥并同步到两边
- 确保没有多余空格或换行
- 使用32位十六进制字符串

### 问题3：Rembg背景移除失败

**症状**：
```
Error: connect ECONNREFUSED 127.0.0.1:7000
```

**检查**：
```bash
# 1. 检查服务状态
docker-compose ps rembg

# 2. 查看端口监听
netstat -tuln | grep 7000

# 3. 测试API
curl http://localhost:7000

# 4. 查看日志
docker-compose logs rembg
```

**解决**：
```bash
# 重启服务
docker-compose restart rembg

# 如果端口冲突，修改端口
# docker-compose.yml: ports: - "7001:7000"
# .env: REMBG_PORT=7001

# 或暂时禁用背景移除
# .env: ENABLE_BG_REMOVAL=false
```

### 问题4：Gemini API超时

**症状**：
```
Error: timeout of 180000ms exceeded
```

**检查**：
```bash
# 1. 测试API连通性
curl -I https://generativelanguage.googleapis.com

# 2. 检查API Key配额
# 访问 https://makersuite.google.com/app/apikey

# 3. 查看n8n超时设置
# Settings → Timeout (应该设置为 -1)
```

**解决**：
- 配置代理（如果无法访问Google）
- 增加超时时间（在workflow节点配置中）
- 切换到备用API Key

### 问题5：任务卡在nas_processing状态

**症状**：
- 任务一直显示"处理中"
- 云函数日志显示NAS已获取任务
- n8n执行失败但没有回调

**检查**：
```bash
# 1. 查看n8n执行历史
# Web界面 → Executions → 查看失败的执行

# 2. 检查错误节点
# 点击红色节点查看错误详情

# 3. 查看数据库task_queue
# 云开发控制台 → 数据库 → task_queue
# 筛选 state=nas_processing
```

**解决**：
```bash
# 手动重置卡住的任务
# 在云开发控制台执行：
# 更新 task_queue 中 state=nas_processing 的记录
# 设置 state=pending, status=pending

# 或通过云函数修复：
cloudbase run functions:invoke fixStuckTasks
```

## 七、性能调优

### 1. 并发控制

```yaml
# n8n docker-compose.yml
environment:
  # 增加并发数
  - N8N_CONCURRENCY_PRODUCTION=5

  # 减少轮询间隔（谨慎，避免云函数限流）
  # workflow中修改cron: */15 * * * * * （15秒）
```

### 2. 背景移除优化

```yaml
# docker-compose.yml
services:
  rembg:
    environment:
      # 使用更快的模型（精度稍低）
      - MODEL=u2netp

      # 如果不需要，直接禁用
      # .env: ENABLE_BG_REMOVAL=false
```

### 3. 图片处理优化

- 前端压缩：上传前将图片压缩到2MB以下
- 格式转换：优先使用WebP格式
- 尺寸限制：限制上传图片分辨率（如2048x2048）

## 八、监控和维护

### 1. 设置监控

```bash
# 创建监控脚本
nano /root/scripts/monitor-ai-services.sh

#!/bin/bash
# 检查Rembg状态
if ! docker ps | grep -q rembg; then
  echo "Rembg服务异常，正在重启..."
  docker-compose -f /root/n8n-workflows/docker-compose.yml restart rembg
fi

# 检查n8n workflow
if ! curl -s http://localhost:5678/healthz | grep -q "ok"; then
  echo "n8n服务异常"
fi

# 添加到crontab
crontab -e
# 每5分钟检查一次
*/5 * * * * /root/scripts/monitor-ai-services.sh
```

### 2. 日志轮转

```bash
# 配置Docker日志大小限制
# docker-compose.yml
services:
  rembg:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 3. 定期清理

```bash
# 清理Docker缓存
docker system prune -a --volumes -f

# 清理n8n旧执行记录
# n8n Web界面 → Settings → Executions
# 设置保留天数：7天
```

## 九、扩展功能（可选）

### 1. 部署本地AI模型

如果NAS性能允许（需要独立显卡）：

```bash
# 部署Stable Diffusion WebUI
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui
cd stable-diffusion-webui
./webui.sh --listen --api

# 在n8n workflow中替换Gemini节点为本地API
```

### 2. 图片存储迁移到NAS

参考 `README.md` 中的"图片存储创新"部分。

### 3. 添加图片质量检测

```bash
# 在workflow中添加质量检测节点
# 使用开源工具：https://github.com/idealo/image-quality-assessment
```

## 十、成本优化建议

当前方案成本对比：

| 项目 | 云函数方案 | NAS方案 | 节省 |
|------|-----------|---------|------|
| 云存储 | 100-300元/月 | 0元 | 100-300元 |
| 云函数调用 | 免费额度内 | 0元 | 0元 |
| NAS电费 | 0元 | 30元/月 | -30元 |
| **合计** | **100-300元/月** | **30元/月** | **70-270元/月** |

**年节省：840-3240元**

## 需要帮助？

- n8n文档：https://docs.n8n.io/
- Rembg文档：https://github.com/danielgatis/rembg
- Gemini API文档：https://ai.google.dev/docs
- 飞牛OS论坛：https://www.fnnas.com/forum

# Scripts 目录说明

本目录包含项目的管理、测试、部署等辅助脚本。

## 目录结构

### 📦 deploy/
部署相关脚本，用于云函数部署和发布。

**常用命令：**
- `deploy-cloudfunctions.ps1` - 部署所有云函数
- `deploy-workers.ps1` - 部署 worker 函数
- `deployment-checklist.ps1` - 部署检查清单

### 🔧 fix/
问题修复脚本，用于解决特定问题。

**说明：** 这些脚本通常是一次性修复脚本，执行前请先备份数据。

### 🐛 debug/
调试分析脚本，用于排查系统问题。

**常用命令：**
- `debug-auth-issue.ps1` - 调试认证问题
- `debug-auth-aimodels.ps1` - 调试 AI 模型权限问题

### ⚙️ setup/
初始化和配置脚本。

**常用命令：**
- `setup-env-vars.ps1` - 配置云环境变量
- `database-init.js` - 初始化数据库
- `setup-admin-user.js` - 创建管理员账号
- `init-packages-collection.js` - 初始化充值套餐

### 🧪 test/
测试脚本，用于功能测试和验证。

**常用命令：**
- `test-payment-flow.js` - 测试支付流程
- `test-simplified-api.js` - 测试 API 接口
- `check-models.js` - 检查 AI 模型配置

### 🗂️ temp/
临时文件和废弃代码。

**说明：** 这些文件可能已过期，谨慎使用。

### 📦 backup/
历史备份文件和修复报告。

**说明：** 包含代码演进过程中的备份版本，仅供参考，不建议在生产环境使用。

## 使用说明

### PowerShell 脚本 (.ps1)
在项目根目录执行：
```powershell
.\scripts\deploy\deploy-cloudfunctions.ps1
```

### Node.js 脚本 (.js)
在项目根目录执行：
```bash
node scripts/test/check-models.js
```

## 注意事项

1. **执行前备份**：某些脚本会修改数据库或云函数，执行前请做好备份
2. **权限要求**：部分脚本需要管理员权限或云开发权限
3. **环境配置**：确保已正确配置 `cloudbaserc.json` 和环境变量
4. **谨慎执行**：生产环境执行脚本前请先在测试环境验证

## 维护记录

- 2025-10-05: 将所有管理脚本从根目录整理到 scripts/ 目录

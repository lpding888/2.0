# AI模型云函数身份验证调试脚本

Write-Host "🔍 开始调试AI模型云函数身份验证问题..." -ForegroundColor Yellow
Write-Host ""

# 显示修复内容
Write-Host "📋 本次修复内容:" -ForegroundColor Cyan
Write-Host "  🔧 增强微信上下文获取的稳定性"
Write-Host "  📊 添加详细的调试日志输出"
Write-Host "  🔐 区分公开接口和需要认证的接口"
Write-Host "  ⚡ 修复checkAdminPermissionAPI参数传递问题"
Write-Host ""

# 检查项目结构
if (-not (Test-Path "cloudfunctions")) {
    Write-Host "❌ 未找到cloudfunctions目录" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 项目结构验证通过" -ForegroundColor Green

# 备份当前aimodels云函数
$backupDir = "aimodels-debug-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (Test-Path "cloudfunctions\aimodels") {
    Copy-Item -Path "cloudfunctions\aimodels" -Destination $backupDir -Recurse -ErrorAction SilentlyContinue
    Write-Host "📦 备份创建: $backupDir" -ForegroundColor Blue
}

Write-Host ""
Write-Host "🔧 调试指南:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1️⃣ 手动部署步骤:" -ForegroundColor Green
Write-Host "   - 打开微信开发者工具"
Write-Host "   - 进入云开发控制台"
Write-Host "   - 选择'云函数'"
Write-Host "   - 找到'aimodels'云函数"
Write-Host "   - 点击'上传并部署'"
Write-Host ""

Write-Host "2️⃣ 调试验证步骤:" -ForegroundColor Green
Write-Host "   - 部署完成后，在小程序中访问管理中心"
Write-Host "   - 查看云函数日志，应该看到详细的调试信息:"
Write-Host "     * '🔍 AI模型云函数调用开始'"
Write-Host "     * '🔍 请求参数:'"
Write-Host "     * '🔍 微信上下文:'"
Write-Host "     * '🔍 获取到的OPENID:'"
Write-Host "     * '✅ 身份验证通过'"
Write-Host ""

Write-Host "3️⃣ 问题排查:" -ForegroundColor Orange
Write-Host "   如果仍然出现'用户身份验证失败':"
Write-Host "   a) 检查OPENID是否为null/undefined"
Write-Host "   b) 检查调用的action是否需要认证"
Write-Host "   c) 检查小程序是否正确登录"
Write-Host "   d) 检查云函数环境是否正确"
Write-Host ""

Write-Host "4️⃣ 公开接口测试:" -ForegroundColor Green
Write-Host "   以下接口不需要登录即可访问:"
Write-Host "   - listModels (获取模型列表)"
Write-Host "   - getModel (获取单个模型)"
Write-Host "   - selectBestModel (选择最佳模型)"
Write-Host ""

Write-Host "5️⃣ 管理员接口测试:" -ForegroundColor Red
Write-Host "   以下接口需要管理员权限:"
Write-Host "   - addModel (添加模型)"
Write-Host "   - updateModel (更新模型)"
Write-Host "   - deleteModel (删除模型)"
Write-Host "   - toggleModelStatus (切换模型状态)"
Write-Host ""

Write-Host "6️⃣ 环境变量检查:" -ForegroundColor Blue
Write-Host "   确保在云开发控制台设置了以下环境变量:"
Write-Host "   - ADMIN_USERS: 管理员openid列表(逗号分隔)"
Write-Host "   - 检查你的实际openid是否在列表中"
Write-Host ""

Write-Host "📱 测试建议:" -ForegroundColor Cyan
Write-Host "1. 先测试公开接口(如listModels)确认基础功能正常"
Write-Host "2. 再测试需要认证的接口"
Write-Host "3. 最后测试管理员权限接口"
Write-Host "4. 每次测试后查看云函数日志获取详细信息"
Write-Host ""

Write-Host "🎯 完成！请按照上述步骤进行调试" -ForegroundColor Green
Write-Host "如有问题，请查看云函数日志中的详细调试信息" -ForegroundColor Blue
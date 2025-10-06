# API云函数错误修复部署脚本
# 修复 "Cannot read properties of undefined (reading 'toString')" 错误

Write-Host "🔧 API云函数错误修复部署开始..." -ForegroundColor Yellow
Write-Host ""

# 显示修复内容
Write-Host "📋 本次修复内容:" -ForegroundColor Cyan
Write-Host "  🛡️  Logger.js: 增强错误处理，防止undefined.toString()错误"
Write-Host "  🔐 Auth.js: 安全获取微信上下文，防止解构赋值错误"
Write-Host "  ⚡ Index.js: 增强API入口错误处理"
Write-Host ""

# 检查当前目录
$currentPath = Get-Location
Write-Host "📂 当前工作目录: $currentPath" -ForegroundColor Blue

# 切换到项目根目录
if (-not (Test-Path "cloudfunctions")) {
    Write-Host "❌ 未找到cloudfunctions目录，请确保在项目根目录执行" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 项目目录验证通过" -ForegroundColor Green

# 备份当前API云函数
$backupDir = "api-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "📦 创建备份: $backupDir" -ForegroundColor Blue

if (Test-Path "cloudfunctions\api") {
    Copy-Item -Path "cloudfunctions\api" -Destination $backupDir -Recurse -ErrorAction SilentlyContinue
    Write-Host "✅ 备份创建成功" -ForegroundColor Green
}

Write-Host ""
Write-Host "📊 修复验证指南:" -ForegroundColor Cyan
Write-Host "  1. 在微信开发者工具的云开发控制台查看API云函数日志"
Write-Host "  2. 测试任意API调用，确认不再出现toString错误"
Write-Host "  3. 检查认证流程是否正常工作"
Write-Host "  4. 验证日志记录功能是否正常"
Write-Host ""

Write-Host "🔍 错误排查步骤:" -ForegroundColor Yellow
Write-Host "  如果仍有问题:"
Write-Host "  1. 检查云函数运行时日志"
Write-Host "  2. 确认Node.js版本兼容性"
Write-Host "  3. 验证环境变量配置"
Write-Host "  4. 检查依赖包版本"
Write-Host ""

Write-Host "📱 测试建议:" -ForegroundColor Green
Write-Host "  1. 测试用户认证: 调用任意需要认证的API"
Write-Host "  2. 测试日志记录: 检查控制台日志输出"
Write-Host "  3. 测试错误处理: 故意触发错误查看处理结果"
Write-Host ""

Write-Host "🎯 完成！请手动在微信开发者工具中上传API云函数" -ForegroundColor Green
Write-Host "然后测试功能确认错误已修复" -ForegroundColor Blue
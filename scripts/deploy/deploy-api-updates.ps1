# 部署API更新的PowerShell脚本

Write-Host "🚀 开始部署API更新..." -ForegroundColor Green

# 部署更新的aimodels云函数
Write-Host "📦 部署aimodels云函数..." -ForegroundColor Yellow
Set-Location "cloudfunctions\aimodels"
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ aimodels依赖安装成功" -ForegroundColor Green
} else {
    Write-Host "❌ aimodels依赖安装失败" -ForegroundColor Red
    exit 1
}

# 返回根目录
Set-Location "..\..\"

# 部署database-init云函数
Write-Host "📦 部署database-init云函数..." -ForegroundColor Yellow
Set-Location "cloudfunctions\database-init"
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ database-init依赖安装成功" -ForegroundColor Green
} else {
    Write-Host "❌ database-init依赖安装失败" -ForegroundColor Red
    exit 1
}

# 返回根目录
Set-Location "..\..\"

Write-Host "🎉 所有云函数已准备就绪！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步操作说明：" -ForegroundColor Cyan
Write-Host "1. 在微信开发者工具中上传并部署aimodels云函数" -ForegroundColor White
Write-Host "2. 在微信开发者工具中上传并部署database-init云函数" -ForegroundColor White
Write-Host "3. 在微信云开发控制台设置环境变量：" -ForegroundColor White
Write-Host "   - GEMINI_OPENAI_API_KEY: 您的OpenAI兼容格式API密钥" -ForegroundColor Gray
Write-Host "   - GEMINI_GOOGLE_API_KEY: 您的Google官方API密钥" -ForegroundColor Gray
Write-Host "4. 运行database-init云函数来添加API模型配置" -ForegroundColor White
Write-Host "5. 在小程序管理后台配置和测试API调用" -ForegroundColor White

Write-Host ""
Write-Host "🔧 API密钥配置方式：" -ForegroundColor Cyan
Write-Host "方式1: 使用环境变量 (推荐)" -ForegroundColor Yellow
Write-Host "  - 在API密钥字段填入：{{GEMINI_OPENAI_API_KEY}} 或 {{GEMINI_GOOGLE_API_KEY}}" -ForegroundColor Gray
Write-Host "  - 系统会自动从环境变量中读取实际密钥" -ForegroundColor Gray
Write-Host ""
Write-Host "方式2: 直接输入API密钥" -ForegroundColor Yellow
Write-Host "  - 直接在API密钥字段填入实际的密钥值" -ForegroundColor Gray
Write-Host "  - 会覆盖环境变量设置" -ForegroundColor Gray

Write-Host ""
Write-Host "✨ 部署完成！请按照上述步骤完成配置。" -ForegroundColor Green
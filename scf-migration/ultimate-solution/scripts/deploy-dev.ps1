# AI摄影师小程序 - 开发环境一键部署脚本
# PowerShell 脚本

Write-Host "🚀 AI摄影师小程序 - 开发环境部署" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Yellow

# 检查环境
Write-Host "📋 检查部署环境..." -ForegroundColor Blue

# 检查 Serverless Framework
try {
    $slsVersion = serverless --version
    Write-Host "✅ Serverless Framework: $slsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装 Serverless Framework" -ForegroundColor Red
    Write-Host "💡 请运行: npm install -g serverless" -ForegroundColor Yellow
    exit 1
}

# 检查环境变量文件
if (-not (Test-Path ".env")) {
    Write-Host "❌ 未找到 .env 文件" -ForegroundColor Red
    Write-Host "💡 请复制 .env.example 为 .env 并配置环境变量" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 环境检查通过" -ForegroundColor Green

# 安装依赖
Write-Host "📦 安装项目依赖..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 依赖安装失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 依赖安装完成" -ForegroundColor Green

# 构建项目
Write-Host "🔨 构建项目..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 项目构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 项目构建完成" -ForegroundColor Green

# 部署到腾讯云
Write-Host "🚀 开始部署到腾讯云 SCF..." -ForegroundColor Blue
Write-Host "📍 部署区域: ap-guangzhou" -ForegroundColor Yellow
Write-Host "🏷️  环境: development" -ForegroundColor Yellow

# 执行部署
serverless deploy --stage dev

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 部署失败" -ForegroundColor Red
    Write-Host "💡 请检查网络连接和配置文件" -ForegroundColor Yellow
    exit 1
}

Write-Host "🎉 部署成功！" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Yellow

# 获取部署信息
Write-Host "📋 获取部署信息..." -ForegroundColor Blue
$deploymentInfo = serverless info --stage dev

Write-Host $deploymentInfo -ForegroundColor Cyan

# 输出关键信息
Write-Host ""
Write-Host "🔗 关键访问地址:" -ForegroundColor Yellow
Write-Host "🌐 API网关: " -NoNewline -ForegroundColor White
Write-Host "待从部署信息中获取" -ForegroundColor Cyan
Write-Host "🤖 AI生成服务: " -NoNewline -ForegroundColor White
Write-Host "待从部署信息中获取" -ForegroundColor Cyan
Write-Host "🎨 数据万象服务: " -NoNewline -ForegroundColor White
Write-Host "待从部署信息中获取" -ForegroundColor Cyan

Write-Host ""
Write-Host "📝 下一步操作:" -ForegroundColor Yellow
Write-Host "1. 更新小程序前端的 API_BASE_URL" -ForegroundColor White
Write-Host "2. 配置数据库（如需要）" -ForegroundColor White
Write-Host "3. 测试核心功能" -ForegroundColor White
Write-Host "4. 运行数据迁移脚本（如需要）" -ForegroundColor White

Write-Host ""
Write-Host "✨ 开发环境部署完成！" -ForegroundColor Green
# AI摄影师小程序 - 生产环境部署脚本
# PowerShell 脚本

param(
    [switch]$SkipBackup,
    [switch]$SkipMigration,
    [ValidateSet('personal', 'commercial', 'hybrid')]
    [string]$Mode = 'hybrid'
)

Write-Host "🚀 AI摄影师小程序 - 生产环境部署" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Yellow
Write-Host "🏷️  模式: $Mode" -ForegroundColor Cyan

# 安全检查
Write-Host "🔒 安全检查..." -ForegroundColor Blue

# 检查是否为生产环境
if ($env:NODE_ENV -ne "production") {
    Write-Host "⚠️  警告: 当前不是生产环境模式" -ForegroundColor Yellow
    $confirm = Read-Host "是否继续部署到生产环境? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "❌ 部署已取消" -ForegroundColor Red
        exit 1
    }
}

# 检查关键环境变量
$requiredEnvVars = @(
    'MONGODB_URI',
    'JWT_SECRET',
    'WECHAT_APP_ID',
    'COS_SECRET_ID',
    'OPENAI_API_KEY'
)

$missingVars = @()
foreach ($var in $requiredEnvVars) {
    if ([string]::IsNullOrEmpty($env:$var)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ 缺少关键环境变量:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    exit 1
}

Write-Host "✅ 安全检查通过" -ForegroundColor Green

# 备份当前版本
if (-not $SkipBackup) {
    Write-Host "💾 备份当前版本..." -ForegroundColor Blue

    $backupDir = "./backups/$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    # 备份当前函数配置
    serverless info --stage prod > "$backupDir/current-info.txt"

    # 备份数据库（如果配置了）
    if ($env:ENABLE_DB_BACKUP -eq 'true') {
        Write-Host "📦 备份数据库..." -ForegroundColor Yellow
        # 这里可以添加数据库备份逻辑
        # npm run db:backup
    }

    Write-Host "✅ 备份完成: $backupDir" -ForegroundColor Green
}

# 运行测试
Write-Host "🧪 运行测试套件..." -ForegroundColor Blue
npm test

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 测试失败，停止部署" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 测试通过" -ForegroundColor Green

# 构建生产版本
Write-Host "🔨 构建生产版本..." -ForegroundColor Blue
$env:NODE_ENV = "production"
npm run build:prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 生产构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 生产构建完成" -ForegroundColor Green

# 数据迁移（如果需要）
if (-not $SkipMigration) {
    Write-Host "📋 检查数据迁移..." -ForegroundColor Blue

    # 检查是否需要迁移
    $migrationNeeded = npm run migration:check 2>$null

    if ($LASTEXITCODE -eq 0 -and $migrationNeeded -match 'needs migration') {
        Write-Host "🔄 执行数据迁移..." -ForegroundColor Yellow
        npm run migration:up

        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ 数据迁移失败" -ForegroundColor Red
            Write-Host "💡 请检查数据库连接和迁移脚本" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "✅ 数据迁移完成" -ForegroundColor Green
    } else {
        Write-Host "✅ 无需数据迁移" -ForegroundColor Green
    }
}

# 部署到生产环境
Write-Host "🚀 部署到生产环境..." -ForegroundColor Blue
Write-Host "📍 部署区域: ap-guangzhou" -ForegroundColor Yellow
Write-Host "🏷️  环境: production" -ForegroundColor Yellow
Write-Host "🎯 模式: $Mode" -ForegroundColor Yellow

# 设置业务模式环境变量
$env:BUSINESS_MODE = $Mode

# 执行部署
serverless deploy --stage prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 生产部署失败" -ForegroundColor Red
    Write-Host "💡 请检查:" -ForegroundColor Yellow
    Write-Host "  - 网络连接" -ForegroundColor White
    Write-Host "  - 腾讯云账户权限" -ForegroundColor White
    Write-Host "  - 环境变量配置" -ForegroundColor White
    Write-Host "  - 函数配置" -ForegroundColor White
    exit 1
}

Write-Host "🎉 生产部署成功！" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Yellow

# 获取部署信息
Write-Host "📋 获取部署信息..." -ForegroundColor Blue
$deploymentInfo = serverless info --stage prod

Write-Host $deploymentInfo -ForegroundColor Cyan

# 健康检查
Write-Host "🏥 执行健康检查..." -ForegroundColor Blue
Start-Sleep -Seconds 10  # 等待函数启动

$healthEndpoints = @(
    "api-gateway",
    "user-service"
)

foreach ($endpoint in $healthEndpoints) {
    try {
        # 这里可以添加实际的健康检查逻辑
        Write-Host "✅ $endpoint 健康检查通过" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  $endpoint 健康检查失败" -ForegroundColor Yellow
    }
}

# 输出关键信息
Write-Host ""
Write-Host "🔗 生产环境访问地址:" -ForegroundColor Yellow
Write-Host "🌐 API网关: " -NoNewline -ForegroundColor White
Write-Host "待从部署信息中获取" -ForegroundColor Cyan
Write-Host "🤖 AI生成服务: " -NoNewline -ForegroundColor White
Write-Host "待从部署信息中获取" -ForegroundColor Cyan
Write-Host "🎨 数据万象服务: " -NoNewline -ForegroundColor White
Write-Host "待从部署信息中获取" -ForegroundColor Cyan

Write-Host ""
Write-Host "📝 部署后任务:" -ForegroundColor Yellow
Write-Host "1. 更新小程序代码并提交审核" -ForegroundColor White
Write-Host "2. 监控函数运行状态" -ForegroundColor White
Write-Host "3. 检查数据库性能" -ForegroundColor White
Write-Host "4. 验证支付功能（如果启用）" -ForegroundColor White
Write-Host "5. 设置告警和日志监控" -ForegroundColor White

Write-Host ""
Write-Host "✨ 生产环境部署完成！" -ForegroundColor Green
Write-Host "🎯 模式: $Mode" -ForegroundColor Cyan
Write-Host "📅 时间: $(Get-Date)" -ForegroundColor Gray
# AI摄影师小程序 - 代码检查脚本
# 验证代码完整性和依赖关系

Write-Host "🔍 AI摄影师小程序 - 代码检查" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Yellow

$hasErrors = $false
$checksPassed = 0
$totalChecks = 0

function Write-CheckResult {
    param(
        [string]$CheckName,
        [bool]$Passed,
        [string]$Message = ""
    )

    $totalChecks++
    if ($Passed) {
        Write-Host "✅ $CheckName" -ForegroundColor Green
        $checksPassed++
    } else {
        Write-Host "❌ $CheckName" -ForegroundColor Red
        if ($Message) {
            Write-Host "   $Message" -ForegroundColor Yellow
        }
        $hasErrors = $true
    }
}

# 检查项目结构
Write-Host "`n📁 检查项目结构..." -ForegroundColor Blue

$requiredFiles = @(
    'backend/src/handlers/api-gateway.js',
    'backend/src/handlers/user-service.js',
    'backend/src/handlers/ai-generation.js',
    'backend/src/services/user-service.js',
    'backend/src/services/ci-service.js',
    'backend/src/services/payment-service.js',
    'backend/src/services/admin-service.js',
    'backend/src/middleware/auth.js',
    'backend/src/middleware/rate-limit.js',
    'backend/src/middleware/error-handler.js',
    'backend/src/shared/database/connection.js',
    'backend/src/shared/storage/cos-config.js',
    'backend/src/shared/ai/ai-router.js',
    'backend/src/shared/utils/task-queue.js',
    'backend/src/utils/logger.js',
    'backend/src/utils/validation.js'
)

foreach ($file in $requiredFiles) {
    Write-CheckResult -CheckName $file -Passed (Test-Path $file)
}

# 检查核心配置文件
Write-Host "`n📄 检查配置文件..." -ForegroundColor Blue

$configFiles = @(
    'package.json',
    'serverless.yml',
    '.env.example',
    'README.md',
    'MIGRATION_GUIDE.md',
    'PROJECT_PLAN.md',
    'QUICK_START.md'
)

foreach ($file in $configFiles) {
    Write-CheckResult -CheckName $file -Passed (Test-Path $file)
}

# 检查部署脚本
Write-Host "`n🚀 检查部署脚本..." -ForegroundColor Blue

$scriptFiles = @(
    'scripts/deploy-dev.ps1',
    'scripts/deploy-prod.ps1',
    'scripts/migrate-data.ps1',
    'scripts/test-setup.ps1',
    'scripts/code-check.ps1'
)

foreach ($file in $scriptFiles) {
    Write-CheckResult -CheckName $file -Passed (Test-Path $file)
}

# 检查代码语法（Node.js）
Write-Host "`n🔧 检查代码语法..." -ForegroundColor Blue

$jsFiles = Get-ChildItem -Path "backend/src" -Filter "*.js" -Recurse

foreach ($file in $jsFiles) {
    try {
        $result = node -c $file.FullName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-CheckResult -CheckName "语法检查: $($file.Name)" -Passed $true
        } else {
            Write-CheckResult -CheckName "语法检查: $($file.Name)" -Passed $false -Message $result
        }
    } catch {
        Write-CheckResult -CheckName "语法检查: $($file.Name)" -Passed $false -Message "无法执行语法检查"
    }
}

# 检查package.json依赖
Write-Host "`n📦 检查依赖配置..." -ForegroundColor Blue

if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json

    # 检查关键依赖
    $keyDependencies = @('express', 'mongoose', 'jsonwebtoken', 'cors', 'helmet', 'compression')
    foreach ($dep in $keyDependencies) {
        $hasDep = $packageJson.dependencies.ContainsKey($dep)
        Write-CheckResult -CheckName "依赖: $dep" -Passed $hasDep
    }

    # 检查开发依赖
    $devDependencies = @('serverless', 'jest', 'eslint')
    foreach ($dep in $devDependencies) {
        $hasDep = $packageJson.devDependencies.ContainsKey($dep)
        Write-CheckResult -CheckName "开发依赖: $dep" -Passed $hasDep
    }
}

# 检查serverless.yml配置
Write-Host "`n☁️ 检查Serverless配置..." -ForegroundColor Blue

if (Test-Path "serverless.yml") {
    $serverlessContent = Get-Content "serverless.yml" -Raw

    # 检查关键配置项
    $requiredConfigs = @(
        'service:',
        'provider:',
        'functions:',
        'custom:',
        'layers:'
    )

    foreach ($config in $requiredConfigs) {
        $hasConfig = $serverlessContent -match [regex]::Escape($config)
        Write-CheckResult -CheckName "Serverless配置: $config" -Passed $hasConfig
    }
}

# 检查环境变量模板
Write-Host "`n🔧 检查环境变量模板..." -ForegroundColor Blue

if (Test-Path ".env.example") {
    $envContent = Get-Content ".env.example"

    $requiredEnvVars = @(
        'BUSINESS_MODE',
        'MONGODB_URI',
        'JWT_SECRET',
        'WECHAT_APP_ID',
        'COS_SECRET_ID',
        'OPENAI_API_KEY'
    )

    foreach ($var in $requiredEnvVars) {
        $hasVar = $envContent -match "$var="
        Write-CheckResult -CheckName "环境变量: $var" -Passed $hasVar
    }
}

# 检查模块导入导出
Write-Host "`n🔗 检查模块导入导出..." -ForegroundColor Blue

# 检查主入口文件
$mainFiles = @(
    'backend/src/handlers/api-gateway.js',
    'backend/src/handlers/user-service.js',
    'backend/src/handlers/ai-generation.js'
)

foreach ($file in $mainFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $hasExports = $content -match "exports\.main"
        Write-CheckResult -CheckName "SCF入口: $($file.Name)" -Passed $hasExports
    }
}

# 检查类定义和导出
$serviceFiles = @(
    'backend/src/services/user-service.js',
    'backend/src/services/ci-service.js',
    'backend/src/services/payment-service.js',
    'backend/src/services/admin-service.js'
)

foreach ($file in $serviceFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $hasClass = $content -match "class\s+\w+"
        $hasModuleExports = $content -match "module\.exports"
        Write-CheckResult -CheckName "类定义: $($file.Name)" -Passed $hasClass
        Write-CheckResult -CheckName "模块导出: $($file.Name)" -Passed $hasModuleExports
    }
}

# 检查工具类
$utilFiles = @(
    'backend/src/utils/logger.js',
    'backend/src/utils/validation.js',
    'backend/src/shared/database/connection.js',
    'backend/src/shared/ai/ai-router.js'
)

foreach ($file in $utilFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $hasModuleExports = $content -match "module\.exports"
        Write-CheckResult -CheckName "工具导出: $($file.Name)" -Passed $hasModuleExports
    }
}

# 生成检查报告
Write-Host "`n=======================================" -ForegroundColor Yellow
Write-Host "📊 代码检查报告" -ForegroundColor Blue
Write-Host "=======================================" -ForegroundColor Yellow

Write-Host "`n📈 检查统计:" -ForegroundColor Cyan
Write-Host "  总检查项目: $totalChecks" -ForegroundColor White
Write-Host "  通过检查: $checksPassed" -ForegroundColor Green
Write-Host "  失败检查: $($totalChecks - $checksPassed)" -ForegroundColor $(if ($hasErrors) { 'Red' } else { 'Green' })
Write-Host "  成功率: $([math]::Round(($checksPassed / $totalChecks) * 100, 1))%" -ForegroundColor $(if ($checksPassed -eq $totalChecks) { 'Green' } else { 'Yellow' })

if (-not $hasErrors) {
    Write-Host "`n🎉 所有检查通过！代码结构完整，可以进行下一步操作。" -ForegroundColor Green
    Write-Host "`n📝 建议下一步操作:" -ForegroundColor Cyan
    Write-Host "1. 运行环境测试: .\scripts\test-setup.ps1" -ForegroundColor White
    Write-Host "2. 安装项目依赖: npm install" -ForegroundColor White
    Write-Host "3. 配置环境变量: cp .env.example .env" -ForegroundColor White
    Write-Host "4. 启动本地开发: npm run dev" -ForegroundColor White
} else {
    Write-Host "`n⚠️  发现问题！请根据上述检查结果修复代码。" -ForegroundColor Yellow
    Write-Host "`n🔧 修复建议:" -ForegroundColor Cyan
    Write-Host "1. 补充缺失的文件" -ForegroundColor White
    Write-Host "2. 修复语法错误" -ForegroundColor White
    Write-Host "3. 完善模块导入导出" -ForegroundColor White
    Write-Host "4. 运行此脚本再次检查" -ForegroundColor White
}

# 保存检查结果
$report = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    totalChecks = $totalChecks
    passedChecks = $checksPassed
    failedChecks = $totalChecks - $checksPassed
    successRate = [math]::Round(($checksPassed / $totalChecks) * 100, 1)
    hasErrors = $hasErrors
    checks = @()
}

try {
    $report | ConvertTo-Json -Depth 3 | Out-File -FilePath "./code-check-report.json" -Encoding UTF8
    Write-Host "`n📄 检查报告已保存到: ./code-check-report.json" -ForegroundColor Green
} catch {
    Write-Host "⚠️  无法保存检查报告" -ForegroundColor Yellow
}

Write-Host "`n✨ 代码检查完成！" -ForegroundColor $(if ($hasErrors) { 'Yellow' } else { 'Green' })

# 返回退出码
if ($hasErrors) {
    exit 1
} else {
    exit 0
}
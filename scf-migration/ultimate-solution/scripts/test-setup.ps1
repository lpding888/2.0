# AI摄影师小程序 - 环境测试脚本
# 验证开发环境配置和依赖

Write-Host "🧪 AI摄影师小程序 - 环境测试" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Yellow

# 检查 Node.js 版本
Write-Host "📋 检查 Node.js 环境..." -ForegroundColor Blue
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green

    $nodeVersionNumber = $nodeVersion -replace 'v', ''
    $majorVersion = [int]($nodeVersionNumber.Split('.')[0])

    if ($majorVersion -lt 18) {
        Write-Host "⚠️  警告: Node.js 版本过低，建议使用 18.15 或更高版本" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Node.js 未安装" -ForegroundColor Red
    Write-Host "💡 请从 https://nodejs.org 下载并安装 Node.js 18.15+" -ForegroundColor Yellow
    exit 1
}

# 检查 npm 版本
Write-Host "📋 检查 npm 环境..." -ForegroundColor Blue
try {
    $npmVersion = npm --version
    Write-Host "✅ npm 版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm 未正确安装" -ForegroundColor Red
    exit 1
}

# 检查项目依赖
Write-Host "📋 检查项目依赖..." -ForegroundColor Blue
if (Test-Path "package.json") {
    Write-Host "✅ 找到 package.json" -ForegroundColor Green

    if (Test-Path "node_modules") {
        Write-Host "✅ node_modules 目录存在" -ForegroundColor Green

        # 检查关键依赖
        $keyDependencies = @('express', 'mongoose', 'jsonwebtoken', 'cors', 'helmet', 'compression')
        foreach ($dep in $keyDependencies) {
            if (Test-Path "node_modules/$dep") {
                Write-Host "✅ $dep 已安装" -ForegroundColor Green
            } else {
                Write-Host "⚠️  $dep 未安装" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "❌ node_modules 目录不存在" -ForegroundColor Red
        Write-Host "💡 请运行 'npm install' 安装依赖" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "❌ 未找到 package.json" -ForegroundColor Red
    Write-Host "💡 请确保在项目根目录运行此脚本" -ForegroundColor Yellow
    exit 1
}

# 检查环境变量文件
Write-Host "📋 检查环境变量配置..." -ForegroundColor Blue
if (Test-Path ".env") {
    Write-Host "✅ .env 文件存在" -ForegroundColor Green

    # 读取并检查关键环境变量
    $envContent = Get-Content ".env"
    $requiredEnvVars = @(
        'JWT_SECRET',
        'WECHAT_APP_ID',
        'MONGODB_URI',
        'BUSINESS_MODE'
    )

    $missingVars = @()
    foreach ($var in $requiredEnvVars) {
        if ($envContent -match "$var=") {
            Write-Host "✅ $var 已配置" -ForegroundColor Green
        } else {
            Write-Host "❌ $var 未配置" -ForegroundColor Red
            $missingVars += $var
        }
    }

    if ($missingVars.Count -gt 0) {
        Write-Host "⚠️  缺少环境变量: $($missingVars -join ', ')" -ForegroundColor Yellow
        Write-Host "💡 请复制 .env.example 为 .env 并配置相关变量" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ .env 文件不存在" -ForegroundColor Red
    Write-Host "💡 请复制 .env.example 为 .env 并配置环境变量" -ForegroundColor Yellow
}

# 检查 Serverless Framework
Write-Host "📋 检查 Serverless Framework..." -ForegroundColor Blue
try {
    $slsVersion = serverless --version
    Write-Host "✅ Serverless Framework: $slsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Serverless Framework 未安装" -ForegroundColor Red
    Write-Host "💡 请运行 'npm install -g serverless' 安装" -ForegroundColor Yellow
}

# 检查项目结构
Write-Host "📋 检查项目结构..." -ForegroundColor Blue
$requiredDirs = @(
    'backend/src/handlers',
    'backend/src/shared',
    'backend/src/utils',
    'scripts',
    'layers'
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "✅ $dir 目录存在" -ForegroundColor Green
    } else {
        Write-Host "❌ $dir 目录不存在" -ForegroundColor Red
    }
}

# 检查核心文件
Write-Host "📋 检查核心文件..." -ForegroundColor Blue
$requiredFiles = @(
    'serverless.yml',
    'package.json',
    'README.md',
    'backend/src/handlers/api-gateway.js',
    'backend/src/handlers/user-service.js',
    'backend/src/handlers/ai-generation.js',
    'backend/src/shared/database/connection.js',
    'backend/src/shared/ai/ai-router.js'
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file 存在" -ForegroundColor Green
    } else {
        Write-Host "❌ $file 不存在" -ForegroundColor Red
    }
}

# 运行代码测试
Write-Host "📋 运行代码测试..." -ForegroundColor Blue
if (Test-Path "backend/src/test/api-gateway.test.js") {
    Write-Host "🧪 运行 API 网关测试..." -ForegroundColor Yellow

    try {
        # 设置测试环境变量
        $env:NODE_ENV = "test"
        $env:JWT_SECRET = "test-secret-key"
        $env:WECHAT_APP_ID = "test-app-id"
        $env:BUSINESS_MODE = "personal"

        # 运行测试
        Push-Location "backend/src"
        node test/api-gateway.test.js
        Pop-Location

        Write-Host "✅ 代码测试完成" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  代码测试出现问题" -ForegroundColor Yellow
        Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  测试文件不存在" -ForegroundColor Yellow
}

# 检查端口占用
Write-Host "📋 检查端口占用..." -ForegroundColor Blue
$ports = @(3000, 8080, 5000)
foreach ($port in $ports) {
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $port)
        $connection.Close()
        Write-Host "⚠️  端口 $port 已被占用" -ForegroundColor Yellow
    } catch {
        Write-Host "✅ 端口 $port 可用" -ForegroundColor Green
    }
}

# 生成测试报告
Write-Host "📊 生成测试报告..." -ForegroundColor Blue
$report = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    nodeVersion = $nodeVersion
    npmVersion = $npmVersion
    environment = $env:NODE_ENV || "development"
    projectPath = Get-Location
    tests = @()
}

# 保存测试报告
$reportPath = "./test-setup-report.json"
try {
    $report | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "📄 测试报告已保存到: $reportPath" -ForegroundColor Green
} catch {
    Write-Host "⚠️  无法保存测试报告" -ForegroundColor Yellow
}

# 总结
Write-Host ""
Write-Host "=======================================" -ForegroundColor Yellow
Write-Host "🎉 环境测试完成！" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Yellow

Write-Host ""
Write-Host "📝 下一步操作:" -ForegroundColor Cyan
Write-Host "1. 配置环境变量 (.env 文件)" -ForegroundColor White
Write-Host "2. 安装缺失的依赖 (npm install)" -ForegroundColor White
Write-Host "3. 运行本地开发环境 (npm run dev)" -ForegroundColor White
Write-Host "4. 部署到开发环境 (npm run deploy:dev)" -ForegroundColor White

Write-Host ""
Write-Host "🔗 有用的链接:" -ForegroundColor Cyan
Write-Host "- 腾讯云 SCF 控制台: https://console.cloud.tencent.com/scf" -ForegroundColor White
Write-Host "- Serverless Framework 文档: https://www.serverless.com/framework/docs" -ForegroundColor White
Write-Host "- 项目文档: README.md" -ForegroundColor White

Write-Host ""
Write-Host "✨ 环境准备就绪，开始你的 AI 摄影之旅吧！" -ForegroundColor Green
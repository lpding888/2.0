# 部署核心修复 - photography和fitting云函数
Write-Host "🔧 部署核心修复..." -ForegroundColor Yellow

$PROJECT_ROOT = Get-Location
$CLI_PATH = "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"

if (-not (Test-Path $CLI_PATH)) {
    Write-Host "❌ 未找到微信开发者工具CLI" -ForegroundColor Red
    exit 1
}

# 修复的云函数列表
$FUNCTIONS = @("photography", "fitting")

foreach ($FUNCTION in $FUNCTIONS) {
    $FUNCTION_PATH = "$PROJECT_ROOT\cloudfunctions\$FUNCTION"

    if (Test-Path $FUNCTION_PATH) {
        Write-Host "📦 正在部署 $FUNCTION 云函数..." -ForegroundColor Blue

        # 切换到函数目录
        Set-Location $FUNCTION_PATH

        # 添加版本标识
        $indexFile = "index.js"
        $indexContent = Get-Content $indexFile -Raw
        $versionMark = "// 修复版本: $(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss') - 异步改同步处理`n"
        $indexContent = $versionMark + $indexContent
        $indexContent | Set-Content $indexFile

        # 安装依赖
        Write-Host "   📥 安装依赖..." -ForegroundColor Gray
        npm install --production

        # 部署
        try {
            & $CLI_PATH upload-cloud-function --name $FUNCTION --path $FUNCTION_PATH
            Write-Host "   ✅ $FUNCTION 部署成功" -ForegroundColor Green
        }
        catch {
            Write-Host "   ❌ $FUNCTION 部署失败: $_" -ForegroundColor Red
        }

        # 返回项目根目录
        Set-Location $PROJECT_ROOT
    }
    else {
        Write-Host "⚠️  云函数目录不存在: $FUNCTION_PATH" -ForegroundColor Yellow
    }
}

Write-Host "🎉 核心修复部署完成！" -ForegroundColor Green
Write-Host "💡 现在测试AI图片生成功能，应该能看到真实的AI图片了" -ForegroundColor Cyan
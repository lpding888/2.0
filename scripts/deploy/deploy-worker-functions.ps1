# 部署AI处理器云函数
Write-Host "🚀 部署AI处理器云函数..." -ForegroundColor Green

$PROJECT_ROOT = Get-Location
$CLI_PATH = "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"

if (-not (Test-Path $CLI_PATH)) {
    Write-Host "❌ 未找到微信开发者工具CLI" -ForegroundColor Red
    exit 1
}

# 需要部署的云函数
$FUNCTIONS = @(
    "photography",
    "photography-worker",
    "fitting",
    "fitting-worker"
)

Write-Host "📋 准备部署以下云函数:" -ForegroundColor Yellow
$FUNCTIONS | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }

foreach ($FUNCTION in $FUNCTIONS) {
    $FUNCTION_PATH = "$PROJECT_ROOT\cloudfunctions\$FUNCTION"

    if (Test-Path $FUNCTION_PATH) {
        Write-Host "📦 正在部署 $FUNCTION 云函数..." -ForegroundColor Blue

        # 切换到函数目录
        Set-Location $FUNCTION_PATH

        # 添加版本标识
        $indexFile = "index.js"
        if (Test-Path $indexFile) {
            $indexContent = Get-Content $indexFile -Raw
            $versionMark = "// 异步架构版本: $(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss')`n"
            $indexContent = $versionMark + $indexContent
            $indexContent | Set-Content $indexFile
        }

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

Write-Host "🎉 AI处理器云函数部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host "🏗️ 新架构说明:" -ForegroundColor Cyan
Write-Host "  📱 用户请求 → photography/fitting (快速响应)" -ForegroundColor White
Write-Host "  ⚙️  AI处理 → photography-worker/fitting-worker (专门处理)" -ForegroundColor White
Write-Host "  📊 结果查询 → getProgress API (轮询状态)" -ForegroundColor White
Write-Host ""
Write-Host "✨ 预期效果:" -ForegroundColor Cyan
Write-Host "  ⚡ 用户请求秒级响应" -ForegroundColor White
Write-Host "  🔄 真正异步处理AI任务" -ForegroundColor White
Write-Host "  🎯 高并发支持，互不影响" -ForegroundColor White
Write-Host "  📸 AI生成图片正确显示" -ForegroundColor White
Write-Host ""
Write-Host "🧪 测试步骤:" -ForegroundColor Cyan
Write-Host "  1. 上传图片生成AI作品" -ForegroundColor White
Write-Host "  2. 观察是否能看到🚀、📸、🔍调试日志" -ForegroundColor White
Write-Host "  3. 检查最终生成的是真实AI图片而非模拟数据" -ForegroundColor White
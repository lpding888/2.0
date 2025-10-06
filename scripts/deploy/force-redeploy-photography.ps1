# 强制重新部署photography云函数
Write-Host "🔄 强制重新部署photography云函数..." -ForegroundColor Yellow

$PROJECT_ROOT = Get-Location
$FUNCTION_PATH = "$PROJECT_ROOT\cloudfunctions\photography"
$CLI_PATH = "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"

if (-not (Test-Path $CLI_PATH)) {
    Write-Host "❌ 未找到微信开发者工具CLI" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $FUNCTION_PATH)) {
    Write-Host "❌ photography云函数目录不存在: $FUNCTION_PATH" -ForegroundColor Red
    exit 1
}

# 切换到函数目录
Set-Location $FUNCTION_PATH

# 添加版本标识到代码中
Write-Host "📝 添加版本标识..." -ForegroundColor Blue
$indexFile = "index.js"
$indexContent = Get-Content $indexFile -Raw

# 在文件开头添加版本标识
$versionMark = "// VERSION: $(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss')`n"
$indexContent = $versionMark + $indexContent
$indexContent | Set-Content $indexFile

Write-Host "📦 安装依赖..." -ForegroundColor Blue
npm install --production

Write-Host "☁️ 开始部署..." -ForegroundColor Blue
try {
    & $CLI_PATH upload-cloud-function --name photography --path $FUNCTION_PATH
    Write-Host "✅ photography云函数部署成功" -ForegroundColor Green
}
catch {
    Write-Host "❌ 部署失败: $_" -ForegroundColor Red
}

# 返回项目根目录
Set-Location $PROJECT_ROOT

Write-Host "🎯 部署完成！请重新测试photography功能" -ForegroundColor Green
Write-Host "💡 建议清除小程序缓存后重新测试" -ForegroundColor Cyan
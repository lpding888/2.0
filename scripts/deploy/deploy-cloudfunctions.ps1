# AI摄影师小程序 - 云函数部署脚本

# 设置变量
$PROJECT_ROOT = Get-Location
$CLOUD_FUNCTIONS_DIR = "$PROJECT_ROOT\cloudfunctions"

Write-Host "🚀 开始部署AI摄影师小程序云函数..." -ForegroundColor Green

# 检查微信开发者工具CLI是否可用
$CLI_PATH = "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"
if (-not (Test-Path $CLI_PATH)) {
    Write-Host "❌ 未找到微信开发者工具CLI，请先安装微信开发者工具" -ForegroundColor Red
    exit 1
}

# 云函数列表
$FUNCTIONS = @(
    "api",
    "user", 
    "photography",
    "fitting",
    "payment",
    "scene",
    "storage",
    "prompt",
    "aimodels"
)

Write-Host "📋 准备部署以下云函数:" -ForegroundColor Yellow
$FUNCTIONS | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }

# 部署每个云函数
foreach ($FUNCTION in $FUNCTIONS) {
    $FUNCTION_PATH = "$CLOUD_FUNCTIONS_DIR\$FUNCTION"
    
    if (Test-Path $FUNCTION_PATH) {
        Write-Host "📦 正在部署云函数: $FUNCTION..." -ForegroundColor Blue
        
        # 切换到函数目录
        Set-Location $FUNCTION_PATH
        
        # 安装依赖（如果有package.json）
        if (Test-Path "package.json") {
            Write-Host "   📥 安装依赖..." -ForegroundColor Gray
            npm install --production
        }
        
        # 使用微信开发者工具CLI部署
        # 注意：这里需要先在微信开发者工具中登录并选择项目
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

Write-Host "🎉 云函数部署完成！" -ForegroundColor Green

# 部署后检查
Write-Host "🔍 部署后检查..." -ForegroundColor Yellow
Write-Host "请在微信开发者工具的云开发控制台中确认以下事项:" -ForegroundColor White
Write-Host "1. 所有云函数状态正常" -ForegroundColor White
Write-Host "2. 数据库集合已创建" -ForegroundColor White
Write-Host "3. 云存储权限已配置" -ForegroundColor White
Write-Host "4. 环境变量已设置" -ForegroundColor White

Write-Host "📚 更多信息请查看部署文档: 云函数架构设计.md" -ForegroundColor Cyan
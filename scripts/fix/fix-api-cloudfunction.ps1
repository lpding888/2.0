# 修复API云函数运行时错误
# 解决TypeError: Cannot read properties of undefined (reading 'toString')

Write-Host "🔧 开始修复API云函数..." -ForegroundColor Yellow

# 检查云函数目录
$apiPath = ".\cloudfunctions\api"
if (-not (Test-Path $apiPath)) {
    Write-Host "❌ 找不到API云函数目录: $apiPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 发现API云函数目录" -ForegroundColor Green

# 重新部署api云函数
Write-Host "📦 重新部署api云函数..." -ForegroundColor Blue
try {
    cd $apiPath
    
    # 安装依赖
    Write-Host "📥 安装依赖包..." -ForegroundColor Blue
    npm install
    
    # 部署云函数
    Write-Host "🚀 部署到云端..." -ForegroundColor Blue
    wx-server-sdk deploy
    
    Write-Host "✅ API云函数部署成功！" -ForegroundColor Green
    
} catch {
    Write-Host "❌ API云函数部署失败: $($_.Exception.Message)" -ForegroundColor Red
    cd ..\..\
    exit 1
}

cd ..\..\

Write-Host "🎉 API云函数修复完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 修复内容:" -ForegroundColor Cyan
Write-Host "  ✅ 修复了worksController中context.wxContext访问错误" 
Write-Host "  ✅ 修复了userController中context.wxContext访问错误"
Write-Host "  ✅ 统一使用cloud.getWXContext()获取用户信息"
Write-Host ""
Write-Host "🔍 请重新测试作品列表功能验证修复效果" -ForegroundColor Yellow
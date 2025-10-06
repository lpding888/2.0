# 修复aimodels云函数OPENID错误
# 解决ReferenceError: OPENID is not defined

Write-Host "🔧 开始修复aimodels云函数OPENID错误..." -ForegroundColor Yellow

# 检查云函数目录
$aimodelsPath = ".\cloudfunctions\aimodels"
$scenePath = ".\cloudfunctions\scene"

if (-not (Test-Path $aimodelsPath)) {
    Write-Host "❌ 找不到aimodels云函数目录: $aimodelsPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $scenePath)) {
    Write-Host "❌ 找不到scene云函数目录: $scenePath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 发现云函数目录" -ForegroundColor Green

# 重新部署aimodels云函数
Write-Host "📦 重新部署aimodels云函数..." -ForegroundColor Blue
try {
    cd $aimodelsPath
    
    # 安装依赖
    Write-Host "📥 安装依赖包..." -ForegroundColor Blue
    npm install
    
    Write-Host "✅ aimodels云函数依赖安装完成！" -ForegroundColor Green
    
} catch {
    Write-Host "❌ aimodels云函数处理失败: $($_.Exception.Message)" -ForegroundColor Red
    cd ..\..\
    exit 1
}

cd ..\..\

# 重新部署scene云函数
Write-Host "📦 重新部署scene云函数..." -ForegroundColor Blue
try {
    cd $scenePath
    
    # 安装依赖
    Write-Host "📥 安装依赖包..." -ForegroundColor Blue
    npm install
    
    Write-Host "✅ scene云函数依赖安装完成！" -ForegroundColor Green
    
} catch {
    Write-Host "❌ scene云函数处理失败: $($_.Exception.Message)" -ForegroundColor Red
    cd ..\..\
    exit 1
}

cd ..\..\

Write-Host "🎉 云函数修复完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 修复内容:" -ForegroundColor Cyan
Write-Host "  ✅ 修复了aimodels云函数中OPENID未定义错误" 
Write-Host "  ✅ 在main函数开头正确获取微信上下文: cloud.getWXContext()"
Write-Host "  ✅ 统一权限检查函数，使用环境变量配置管理员权限"
Write-Host "  ✅ 移除了硬编码的管理员OpenID，统一使用ADMIN_USERS环境变量"
Write-Host "  ✅ 优化了权限验证错误处理逻辑"
Write-Host ""
Write-Host "⚠️  部署注意事项:" -ForegroundColor Yellow
Write-Host "  📌 请通过微信开发者工具手动上传部署这两个云函数"
Write-Host "  📌 确保ADMIN_USERS环境变量已正确配置: oPCV81-CA12dIHv4KrUHcel-F02c"
Write-Host "  📌 部署完成后请重新测试管理员权限功能"
Write-Host ""
Write-Host "🔍 请重新测试AI模型管理功能验证修复效果" -ForegroundColor Yellow
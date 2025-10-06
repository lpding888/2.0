# 强制重新部署 aimodels 云函数
Write-Host "🚀 强制重新部署 aimodels 云函数" -ForegroundColor Yellow
Write-Host ""

Write-Host "📋 操作步骤："
Write-Host "1. 在微信开发者工具中右键 'cloudfunctions/aimodels' 文件夹"
Write-Host "2. 选择 '删除云端文件夹' (如果有的话)"
Write-Host "3. 等待删除完成"
Write-Host "4. 再次右键 'cloudfunctions/aimodels' 文件夹"
Write-Host "5. 选择 '上传并部署：云端安装依赖'"
Write-Host "6. 等待部署完成"
Write-Host ""

Write-Host "🔍 验证步骤："
Write-Host "1. 部署完成后，重新编译小程序"
Write-Host "2. 进入权限测试页面"
Write-Host "3. 查看新的日志，应该显示："
Write-Host "   - 🔍 AI模型权限检查 - 版本: v2.0 (已修正openid)"
Write-Host "   - 🔍 AI模型权限检查 - 最终结果: true"
Write-Host "   - message: '管理员权限验证成功'"
Write-Host ""

Write-Host "💡 如果仍然不行，请检查："
Write-Host "1. 云函数是否真的部署成功（查看控制台部署日志）"
Write-Host "2. 是否存在网络缓存（清除浏览器缓存）"
Write-Host "3. 是否存在其他地方调用了旧版本的检查逻辑"
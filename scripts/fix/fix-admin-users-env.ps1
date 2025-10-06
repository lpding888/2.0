# 环境变量 ADMIN_USERS 修正指南

Write-Host "🔧 修正 ADMIN_USERS 环境变量配置" -ForegroundColor Yellow
Write-Host ""

Write-Host "❌ 当前错误的环境变量值:" -ForegroundColor Red
Write-Host "   oPC81-CA12dIHv4KrUHce1-F02c"
Write-Host ""

Write-Host "✅ 正确的环境变量值:" -ForegroundColor Green
Write-Host "   oPCV81-CA12dIHv4KrUHcel-F02c"
Write-Host ""

Write-Host "📋 修正步骤："
Write-Host "1. 进入微信云开发控制台"
Write-Host "2. 点击 '云函数' 选项卡"
Write-Host "3. 依次修正以下云函数的环境变量："
Write-Host ""

Write-Host "   🔧 aimodels 云函数："
Write-Host "      - 点击 'aimodels' 云函数名称"
Write-Host "      - 找到 '环境变量' 或 '函数配置' 选项"
Write-Host "      - 修改 ADMIN_USERS = oPCV81-CA12dIHv4KrUHcel-F02c"
Write-Host "      - 点击保存"
Write-Host ""

Write-Host "   🔧 prompt 云函数："
Write-Host "      - 重复上述步骤"
Write-Host ""

Write-Host "   🔧 scene 云函数："
Write-Host "      - 重复上述步骤"
Write-Host ""

Write-Host "   🔧 debug-scenes 云函数："
Write-Host "      - 重复上述步骤"
Write-Host ""

Write-Host "💡 修正完成后："
Write-Host "1. 重新部署 aimodels 云函数"
Write-Host "2. 重新编译小程序"
Write-Host "3. 测试权限验证"
Write-Host ""

Write-Host "🔍 预期结果："
Write-Host "   🔍 AI模型权限检查 - 版本: v3.0 (使用环境变量)"
Write-Host "   🔍 AI模型权限检查 - 环境变量值: oPCV81-CA12dIHv4KrUHcel-F02c"
Write-Host "   🔍 AI模型权限检查 - 是否匹配: true"
Write-Host "   🔍 AI模型权限检查 - 最终结果: true"
Write-Host ""

Write-Host "✅ 成功标志: message = '管理员权限验证成功'"
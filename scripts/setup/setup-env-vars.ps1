# 云函数环境变量配置脚本
# 为所有需要管理员权限的云函数统一设置环境变量

# 需要设置 ADMIN_USERS 环境变量的云函数列表：
# 1. auth - 权限验证云函数
# 2. prompt - 提示词管理云函数  
# 3. aimodels - AI模型管理云函数
# 4. scene - 场景管理云函数
# 5. debug-scenes - 调试云函数

# 环境变量配置
$adminUsers = "oPC81-CA12dIHv4KrUHce1-F02c"

Write-Host "开始为云函数设置环境变量..."
Write-Host "管理员 openid: $adminUsers"
Write-Host ""

Write-Host "需要手动在云开发控制台中为以下云函数设置环境变量："
Write-Host "变量名: ADMIN_USERS"
Write-Host "变量值: $adminUsers"
Write-Host ""

Write-Host "云函数列表："
Write-Host "1. auth (权限验证)"
Write-Host "2. prompt (提示词管理)"
Write-Host "3. aimodels (AI模型管理)"
Write-Host "4. scene (场景管理)"
Write-Host "5. debug-scenes (调试功能)"
Write-Host ""

Write-Host "设置步骤："
Write-Host "1. 进入云开发控制台"
Write-Host "2. 点击 '云函数' 选项卡"
Write-Host "3. 依次点击上述每个云函数名称"
Write-Host "4. 在云函数详情页找到 '环境变量' 设置"
Write-Host "5. 添加 ADMIN_USERS = $adminUsers"
Write-Host "6. 保存并重新部署云函数"
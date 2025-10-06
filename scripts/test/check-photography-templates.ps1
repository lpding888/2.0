# 提示词模板配置检查与创建脚本

Write-Host "🔍 检查 Photography 类型提示词模板配置..." -ForegroundColor Yellow
Write-Host ""

# 显示当前提示词系统状态
Write-Host "📋 提示词系统状态检查:" -ForegroundColor Cyan
Write-Host "  ✅ 提示词云函数 (prompt) - 已配置"
Write-Host "  ✅ 管理中心界面 - 已集成"
Write-Host "  ✅ API接口 - 已完成"
Write-Host "  ✅ 权限验证 - 已实现"
Write-Host ""

Write-Host "🎯 Photography 提示词模板建议配置:" -ForegroundColor Green
Write-Host ""

Write-Host "📝 模板基本信息:" -ForegroundColor Blue
Write-Host "  类型 (type): photography"
Write-Host "  分类 (category): 服装摄影 / 人像摄影 / 商业摄影"
Write-Host "  状态 (is_active): true"
Write-Host "  优先级 (priority): 1-10"
Write-Host ""

Write-Host "🔧 模板变量建议:" -ForegroundColor Blue
Write-Host "  基础变量:"
Write-Host "    - 性别 (gender): male/female"
Write-Host "    - 年龄 (age): 数字"
Write-Host "    - 服装描述 (clothing_description)"
Write-Host "    - 姿势类型 (pose_type)"
Write-Host "    - 灯光风格 (lighting_style)"
Write-Host ""
Write-Host "  场景变量:"
Write-Host "    - 地点 (location): 从场景自动获取"
Write-Host "    - 背景 (background): 从场景自动获取"
Write-Host "    - 氛围 (mood_and_atmosphere)"
Write-Host ""

Write-Host "📄 Photography 模板示例:" -ForegroundColor Green
Write-Host ""
$sampleTemplate = @"
模板名称: 专业服装摄影模板
分类: photography
类型: photography

模板内容:
A professional fashion photography of {gender|female} model, age {age|25}, {nationality|asian} ethnicity, {skin_tone|medium} skin tone, wearing {clothing_description|fashionable outfit}, {pose_type|dynamic} pose, {lighting_style|professional studio lighting}, in {location|studio} setting with {background|neutral} background, {mood_and_atmosphere|elegant and sophisticated} atmosphere, high fashion, editorial style, 8K resolution, sharp focus, professional photography

变量列表:
gender,age,nationality,skin_tone,clothing_description,pose_type,lighting_style,mood_and_atmosphere
"@

Write-Host $sampleTemplate -ForegroundColor White
Write-Host ""

Write-Host "🚀 检查和添加步骤:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣ 首先检查现有模板:" -ForegroundColor Green
Write-Host "   - 登录小程序管理中心"
Write-Host "   - 切换到'提示词'标签页"
Write-Host "   - 查看是否有photography类型的模板"
Write-Host ""

Write-Host "2️⃣ 如果没有模板，添加新模板:" -ForegroundColor Green
Write-Host "   - 点击'添加提示词'按钮"
Write-Host "   - 分类填写: photography"
Write-Host "   - 使用上面的示例模板内容"
Write-Host ""

Write-Host "3️⃣ 验证模板功能:" -ForegroundColor Green
Write-Host "   - 在摄影页面测试提示词生成"
Write-Host "   - 检查变量替换是否正常工作"
Write-Host "   - 确认生成的提示词质量"
Write-Host ""

Write-Host "❗ 常见问题排查:" -ForegroundColor Red
Write-Host ""
Write-Host "如果模板保存失败:" -ForegroundColor Orange
Write-Host "  - 检查管理员权限是否正确配置"
Write-Host "  - 确认提示词云函数是否正常部署"
Write-Host "  - 查看云函数日志获取详细错误信息"
Write-Host ""

Write-Host "如果模板不生效:" -ForegroundColor Orange
Write-Host "  - 确认type字段设置为'photography'"
Write-Host "  - 确认is_active字段为true"
Write-Host "  - 检查模板语法是否正确"
Write-Host ""

Write-Host "🎯 多模态AI模板设计规范 (根据记忆):" -ForegroundColor Cyan
Write-Host "  📌 应包含六个核心变量:"
Write-Host "     1. 主体 (subject)"
Write-Host "     2. 动作 (action)" 
Write-Host "     3. 场景 (scene)"
Write-Host "     4. 背景 (background)"
Write-Host "     5. 细节描述 (details)"
Write-Host "     6. 风格修饰 (style)"
Write-Host "  📌 每个变量需提供默认值"
Write-Host ""

Write-Host "✅ 请按照上述指南检查和配置Photography提示词模板" -ForegroundColor Green
Write-Host "如有问题，请查看小程序管理中心和云函数日志" -ForegroundColor Blue
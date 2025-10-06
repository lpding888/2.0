# 创建默认Photography提示词模板脚本

Write-Host "🎯 正在创建默认Photography提示词模板..." -ForegroundColor Yellow
Write-Host ""

# 生成模板数据
$photographyTemplate = @{
    name = "默认服装摄影模板"
    description = "专业服装摄影的标准提示词模板，支持多种变量自定义"
    type = "photography"
    category = "服装摄影"
    template = "A professional fashion photography of {gender|female} model, age {age|25}, {nationality|asian} ethnicity, {skin_tone|medium} skin tone, wearing {clothing_description|fashionable outfit}, {pose_type|dynamic} pose, {lighting_style|professional studio lighting}, in {location|studio} setting with {background|neutral} background, {mood_and_atmosphere|elegant and sophisticated} atmosphere, high fashion, editorial style, 8K resolution, sharp focus, professional photography"
    variables = @(
        "gender",
        "age", 
        "nationality",
        "skin_tone",
        "clothing_description",
        "pose_type",
        "lighting_style",
        "mood_and_atmosphere"
    )
    default_params = @{
        gender = "female"
        age = 25
        nationality = "asian"
        skin_tone = "medium"
        clothing_description = "fashionable outfit"
        pose_type = "dynamic"
        lighting_style = "professional studio lighting"
        mood_and_atmosphere = "elegant and sophisticated"
    }
    is_active = $true
    priority = 10
    created_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    updated_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
}

# 转换为JSON
$templateJson = $photographyTemplate | ConvertTo-Json -Depth 10

Write-Host "✅ 默认Photography模板已生成" -ForegroundColor Green

# 保存到文件
$templateFile = "default-photography-template.json"
$templateJson | Out-File -FilePath $templateFile -Encoding UTF8

Write-Host "📄 模板已保存到: $templateFile" -ForegroundColor Blue

Write-Host ""
Write-Host "📋 模板详情:" -ForegroundColor Cyan
Write-Host "  名称: 默认服装摄影模板"
Write-Host "  类型: photography"
Write-Host "  分类: 服装摄影"
Write-Host "  状态: 激活"
Write-Host "  优先级: 10 (最高)"
Write-Host ""

Write-Host "🔧 支持的变量:" -ForegroundColor Green
Write-Host "  - gender (性别): male/female"
Write-Host "  - age (年龄): 数字"
Write-Host "  - nationality (国籍): asian/western/etc"
Write-Host "  - skin_tone (肤色): light/medium/dark"
Write-Host "  - clothing_description (服装描述): 自定义文本"
Write-Host "  - pose_type (姿势): dynamic/static/elegant/etc"
Write-Host "  - lighting_style (灯光): professional studio lighting/etc"
Write-Host "  - mood_and_atmosphere (氛围): elegant/sophisticated/etc"
Write-Host ""

Write-Host "🚀 部署步骤:" -ForegroundColor Yellow
Write-Host "1. 登录微信小程序管理中心"
Write-Host "2. 切换到'提示词'标签页"
Write-Host "3. 点击'添加提示词'按钮"
Write-Host "4. 复制以下内容到表单中:"
Write-Host ""

Write-Host "📝 表单内容:" -ForegroundColor Blue
Write-Host "模板名称: 默认服装摄影模板"
Write-Host "模板描述: 专业服装摄影的标准提示词模板，支持多种变量自定义"
Write-Host "分类: photography"
Write-Host ""
Write-Host "提示词模板:"
Write-Host "A professional fashion photography of {gender|female} model, age {age|25}, {nationality|asian} ethnicity, {skin_tone|medium} skin tone, wearing {clothing_description|fashionable outfit}, {pose_type|dynamic} pose, {lighting_style|professional studio lighting}, in {location|studio} setting with {background|neutral} background, {mood_and_atmosphere|elegant and sophisticated} atmosphere, high fashion, editorial style, 8K resolution, sharp focus, professional photography"
Write-Host ""
Write-Host "变量列表:"
Write-Host "gender,age,nationality,skin_tone,clothing_description,pose_type,lighting_style,mood_and_atmosphere"
Write-Host ""

Write-Host "✅ 添加此模板后，Photography页面将能够自动生成完整的系统提示词！" -ForegroundColor Green
Write-Host "📊 测试方法: 在摄影页面上传图片并点击生成，查看云函数日志确认提示词生成" -ForegroundColor Blue
# 添加 Gemini (Nano Banana) AI图像生成模型配置
# 基于Google Gemini 2.5 Flash Image Preview API

Write-Host "🍌 开始添加 Gemini (Nano Banana) AI模型配置..." -ForegroundColor Yellow

# 创建Gemini模型配置数据
$geminiConfig = @{
    name = "Gemini 2.5 Flash Image (Nano Banana)"
    description = "Google Gemini 2.5 Flash Image Preview - 支持文本到图像生成和图像理解的多模态AI模型，特别擅长创意场景和概念艺术生成"
    provider = "google"
    model_type = "multimodal"
    api_config = @{
        model_name = "gemini-2.5-flash-image-preview"
        endpoint = "https://generativeai.googleapis.com/v1/models/gemini-2.5-flash-image-preview:generateContent"
        api_key_env = "GOOGLE_AI_API_KEY"
        headers = @{
            "Content-Type" = "application/json"
        }
        timeout = 60
        max_retries = 3
    }
    parameters = @{
        default = @{
            temperature = 0.7
            top_p = 0.9
            top_k = 40
            max_output_tokens = 2048
            safety_settings = @(
                @{
                    category = "HARM_CATEGORY_HARASSMENT"
                    threshold = "BLOCK_MEDIUM_AND_ABOVE"
                },
                @{
                    category = "HARM_CATEGORY_HATE_SPEECH"  
                    threshold = "BLOCK_MEDIUM_AND_ABOVE"
                },
                @{
                    category = "HARM_CATEGORY_SEXUALLY_EXPLICIT"
                    threshold = "BLOCK_MEDIUM_AND_ABOVE"
                },
                @{
                    category = "HARM_CATEGORY_DANGEROUS_CONTENT"
                    threshold = "BLOCK_MEDIUM_AND_ABOVE"
                }
            )
        }
        image_generation = @{
            style = "photorealistic"
            aspect_ratio = "1:1"
            quality = "high"
            safety_filter = "strict"
        }
    }
    capabilities = @(
        "text_to_image",
        "image_understanding", 
        "multimodal_conversation",
        "creative_generation",
        "concept_art"
    )
    pricing = @{
        input_cost_per_1k_tokens = 0.075
        output_cost_per_1k_tokens = 0.30
        cost_per_image = 0.0025
        currency = "USD"
    }
    limits = @{
        max_tokens = 8192
        max_images = 16
        max_requests_per_minute = 60
        max_requests_per_day = 1000
    }
    is_active = $true
    priority = 8
    weight = 85
    tags = @("multimodal", "image-generation", "google", "gemini", "creative", "nano-banana")
    created_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    updated_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
}

# 转换为JSON格式
$geminiJson = $geminiConfig | ConvertTo-Json -Depth 10

Write-Host "✅ Gemini模型配置已生成" -ForegroundColor Green

# 保存配置到文件
$configFile = "gemini-nano-banana-config.json"
$geminiJson | Out-File -FilePath $configFile -Encoding UTF8

Write-Host "📄 配置已保存到: $configFile" -ForegroundColor Blue

Write-Host ""
Write-Host "📋 Gemini (Nano Banana) 模型特性:" -ForegroundColor Cyan
Write-Host "  🍌 模型名称: Gemini 2.5 Flash Image (Nano Banana)" 
Write-Host "  🚀 提供商: Google AI"
Write-Host "  🎨 支持功能: 文本生成图像、图像理解、多模态对话"
Write-Host "  ✨ 特色场景: 创意餐厅、奇幻场景、概念艺术"
Write-Host "  🔒 安全过滤: 内置多层安全检查"
Write-Host "  💰 定价模式: 按tokens + 图像计费"
Write-Host ""
Write-Host "🔧 集成步骤:" -ForegroundColor Yellow
Write-Host "  1. 通过管理中心界面添加此模型配置"
Write-Host "  2. 设置环境变量 GOOGLE_AI_API_KEY"
Write-Host "  3. 测试'奇幻餐厅'场景进行验证"
Write-Host ""
Write-Host "💡 使用示例:" -ForegroundColor Green
Write-Host "  场景: 奇幻餐厅"
Write-Host "  提示词: '一只可爱的猫咪在高档餐厅里享用纳米香蕉，双子座星空背景'"
Write-Host "  参数: 高质量、创意风格、1:1比例"
Write-Host ""
Write-Host "⚠️  注意事项:" -ForegroundColor Red
Write-Host "  📌 需要有效的Google AI API密钥"
Write-Host "  📌 遵守Google AI使用政策和内容安全准则"
Write-Host "  📌 注意API调用频率限制和成本控制"
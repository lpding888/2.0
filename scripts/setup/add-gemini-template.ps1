# Add Gemini AI Template Configuration
# Based on user provided Gemini code example

# Gemini Template Configuration
$geminiTemplate = @{
    type = "photography"
    category = "gemini"
    name = "Gemini Creative Image Generation Template"
    description = "Specialized template for Gemini AI model creative image generation, supports multimodal input (text+image), can generate cats, nano-bananas, fancy restaurants and other creative scenes"
    template = "Create a picture of {subject} {action} in a {location} under the {constellation} constellation. {additional_details} {style_modifiers}"
    variables = @(
        "subject",
        "action", 
        "location",
        "constellation",
        "additional_details",
        "style_modifiers"
    )
    default_params = @{
        subject = "my cat"
        action = "eating a nano-banana"
        location = "fancy restaurant"
        constellation = "Gemini"
        additional_details = "with elegant lighting and sophisticated atmosphere"
        style_modifiers = "high quality, detailed, realistic style"
    }
    is_active = $true
    priority = 10
    model_type = "gemini"
    capabilities = @("text_to_image", "multimodal", "creative_generation")
}

Write-Host "Adding Gemini template to cloud database..." -ForegroundColor Green

# Convert to JSON for cloud function call
$templateJson = $geminiTemplate | ConvertTo-Json -Depth 5 -Compress

Write-Host "Template Configuration:" -ForegroundColor Yellow
Write-Host $templateJson -ForegroundColor Cyan

Write-Host "`n=== Manual Add Instructions ===" -ForegroundColor Green
Write-Host "1. Open WeChat Developer Tools" -ForegroundColor White
Write-Host "2. Go to Mini Program Admin Center page" -ForegroundColor White
Write-Host "3. Click 'Prompt Templates' tab" -ForegroundColor White
Write-Host "4. Click 'Add Template' button" -ForegroundColor White
Write-Host "5. Fill in the following information:" -ForegroundColor White

Write-Host "`nTemplate Name: " -ForegroundColor Yellow -NoNewline
Write-Host "Gemini Creative Image Generation Template" -ForegroundColor Cyan

Write-Host "Description: " -ForegroundColor Yellow -NoNewline
Write-Host "Specialized template for Gemini AI model creative image generation" -ForegroundColor Cyan

Write-Host "Category: " -ForegroundColor Yellow -NoNewline
Write-Host "gemini" -ForegroundColor Cyan

Write-Host "Template: " -ForegroundColor Yellow -NoNewline
Write-Host "Create a picture of {subject} {action} in a {location} under the {constellation} constellation. {additional_details} {style_modifiers}" -ForegroundColor Cyan

Write-Host "Variables: " -ForegroundColor Yellow -NoNewline
Write-Host "subject, action, location, constellation, additional_details, style_modifiers" -ForegroundColor Cyan

Write-Host "`n=== Default Variable Values ===" -ForegroundColor Green
Write-Host "subject: my cat" -ForegroundColor White
Write-Host "action: eating a nano-banana" -ForegroundColor White
Write-Host "location: fancy restaurant" -ForegroundColor White
Write-Host "constellation: Gemini" -ForegroundColor White
Write-Host "additional_details: with elegant lighting and sophisticated atmosphere" -ForegroundColor White
Write-Host "style_modifiers: high quality, detailed, realistic style" -ForegroundColor White

Write-Host "`n=== Test Prompt Example ===" -ForegroundColor Green
$testPrompt = "Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation. with elegant lighting and sophisticated atmosphere high quality, detailed, realistic style"
Write-Host "Generated test prompt:" -ForegroundColor Yellow
Write-Host $testPrompt -ForegroundColor Cyan

Write-Host "`nGemini template configuration completed!" -ForegroundColor Green
Write-Host "Now you can find 'Gemini' option in the AI model type selection in admin center." -ForegroundColor Yellow
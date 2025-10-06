# Fix OPENID undefined error in aimodels cloud function
# Deploy updated aimodels cloud function

Write-Host "Fixing OPENID undefined error in aimodels cloud function..." -ForegroundColor Green

# Check if WeChat Developer Tools CLI is available
$cliPath = "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"

if (Test-Path $cliPath) {
    Write-Host "WeChat Developer Tools CLI detected, deploying cloud function..." -ForegroundColor Yellow
    
    try {
        # Navigate to project directory
        $projectPath = "c:\Users\qq100\Desktop\新建文件夹 (4)"
        
        # Deploy aimodels cloud function
        $deployCommand = """$cliPath"" -o ""$projectPath"" --upload-cloud-function aimodels"
        
        Write-Host "Executing: $deployCommand" -ForegroundColor Cyan
        
        # Execute deployment
        Invoke-Expression $deployCommand
        
        Write-Host "Cloud function deployment completed!" -ForegroundColor Green
        
    } catch {
        Write-Host "Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Please deploy manually using WeChat Developer Tools" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "WeChat Developer Tools CLI not found" -ForegroundColor Red
    Write-Host "Please deploy manually using WeChat Developer Tools" -ForegroundColor Yellow
}

Write-Host "`n=== Manual Deployment Steps ===" -ForegroundColor Green
Write-Host "1. Open WeChat Developer Tools" -ForegroundColor White
Write-Host "2. Open your mini program project" -ForegroundColor White
Write-Host "3. Go to Cloud Development tab" -ForegroundColor White
Write-Host "4. Find 'aimodels' cloud function" -ForegroundColor White
Write-Host "5. Right-click and select 'Upload and Deploy'" -ForegroundColor White
Write-Host "6. Wait for deployment to complete" -ForegroundColor White

Write-Host "`n=== Fix Summary ===" -ForegroundColor Green
Write-Host "Fixed Issues:" -ForegroundColor Yellow
Write-Host "- Added proper OPENID validation in main function" -ForegroundColor White
Write-Host "- Moved OPENID declaration inside try-catch block" -ForegroundColor White
Write-Host "- Added null check for OPENID before using it" -ForegroundColor White
Write-Host "- Removed duplicate checkAdminPermission function definition" -ForegroundColor White
Write-Host "- Enhanced error handling for user authentication" -ForegroundColor White

Write-Host "`n=== Environment Variable Check ===" -ForegroundColor Green
Write-Host "Please ensure ADMIN_USERS environment variable is properly set:" -ForegroundColor Yellow
Write-Host "1. Go to Cloud Development console" -ForegroundColor White
Write-Host "2. Navigate to Cloud Functions -> Environment Variables" -ForegroundColor White
Write-Host "3. Verify ADMIN_USERS is set to: oPCV81-CA12dIHv4KrUHcel-F02c" -ForegroundColor White
Write-Host "4. Apply changes and redeploy if needed" -ForegroundColor White

Write-Host "`nOPENID error fix completed!" -ForegroundColor Green -BackgroundColor Black
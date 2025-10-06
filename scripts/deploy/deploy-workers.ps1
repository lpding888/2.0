# Deploy worker functions
Write-Host "Deploying worker functions..." -ForegroundColor Green

$CLI_PATH = "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"

if (-not (Test-Path $CLI_PATH)) {
    Write-Host "WeChat Developer Tools CLI not found" -ForegroundColor Red
    exit 1
}

$FUNCTIONS = @("photography-worker", "fitting-worker")

foreach ($FUNCTION in $FUNCTIONS) {
    $FUNCTION_PATH = "cloudfunctions\$FUNCTION"

    if (Test-Path $FUNCTION_PATH) {
        Write-Host "Deploying $FUNCTION..." -ForegroundColor Blue

        Set-Location $FUNCTION_PATH
        npm install --production

        try {
            & $CLI_PATH upload-cloud-function --name $FUNCTION --path (Get-Location)
            Write-Host "$FUNCTION deployed successfully" -ForegroundColor Green
        }
        catch {
            Write-Host "$FUNCTION deployment failed: $_" -ForegroundColor Red
        }

        Set-Location ..\..
    }
    else {
        Write-Host "Function directory not found: $FUNCTION_PATH" -ForegroundColor Yellow
    }
}

Write-Host "Worker deployment complete!" -ForegroundColor Green
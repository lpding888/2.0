# 修复AI模型选择失败问题的部署脚本

Write-Host "🔧 开始修复AI模型选择问题..." -ForegroundColor Cyan

# 1. 部署修复后的aimodels云函数
Write-Host "📤 部署aimodels云函数修复..." -ForegroundColor Yellow
try {
    Set-Location "cloudfunctions/aimodels"
    npx tcb fn deploy aimodels --force
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ aimodels云函数部署成功" -ForegroundColor Green
    } else {
        Write-Host "❌ aimodels云函数部署失败" -ForegroundColor Red
        exit 1
    }
    Set-Location "../.."
} catch {
    Write-Host "❌ 部署过程出错: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 AI模型选择问题修复完成！" -ForegroundColor Green
Write-Host ""
Write-Host "修复内容说明:" -ForegroundColor Cyan
Write-Host "1. 实现多策略模型查询：优先查询同时满足status=active和is_active=true的模型" -ForegroundColor White
Write-Host "2. 降级策略支持：如果主策略失败，自动尝试其他条件组合" -ForegroundColor White
Write-Host "3. 详细日志记录：增加详细的查询过程和结果日志" -ForegroundColor White
Write-Host "4. 错误诊断信息：当所有策略失败时，显示数据库中的实际模型状态" -ForegroundColor White
Write-Host ""
Write-Host "现在系统将能够：" -ForegroundColor Yellow
Write-Host "- 正确识别和使用你的两个不同渠道的AI模型" -ForegroundColor White
Write-Host "- 在主模型不可用时自动切换到备用模型" -ForegroundColor White
Write-Host "- 提供详细的模型选择过程日志便于调试" -ForegroundColor White
# 修复图片上传错误的部署脚本
# 解决任务完成但图片为空的问题

Write-Host "🔧 开始修复图片上传错误问题..." -ForegroundColor Cyan

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
Write-Host "🎉 图片上传错误修复完成！" -ForegroundColor Green
Write-Host ""
Write-Host "修复内容说明:" -ForegroundColor Cyan
Write-Host "1. 改进了错误处理逻辑：当所有图片上传都失败时，任务状态标记为'failed'而不是'completed'" -ForegroundColor White
Write-Host "2. 增强了错误日志记录：提供更详细的上传失败信息便于调试" -ForegroundColor White
Write-Host "3. 完善了状态同步：作品记录和任务队列状态保持一致" -ForegroundColor White
Write-Host ""
Write-Host "🔍 如果问题仍然存在，请检查云存储权限和网络连接" -ForegroundColor Yellow
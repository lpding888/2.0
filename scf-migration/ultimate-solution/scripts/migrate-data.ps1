# AI摄影师小程序 - 数据迁移脚本
# 从微信云开发迁移到腾讯云 MongoDB

param(
    [switch]$DryRun,
    [switch]$SkipValidation,
    [string]$WeChatEnvId = $env:WECHAT_ENV_ID,
    [string]$MongoDBUri = $env:MONGODB_URI
)

Write-Host "🔄 AI摄影师小程序 - 数据迁移" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "🔍 干运行模式 - 不会实际迁移数据" -ForegroundColor Cyan
}

# 检查环境
Write-Host "📋 检查迁移环境..." -ForegroundColor Blue

# 检查微信云开发 CLI
try {
    $tcbVersion = tcb --version
    Write-Host "✅ 微信云开发 CLI: $tcbVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装微信云开发 CLI" -ForegroundColor Red
    Write-Host "💡 请运行: npm install -g @cloudbase/cli" -ForegroundColor Yellow
    exit 1
}

# 检查 MongoDB 工具
try {
    $mongoVersion = mongodump --version
    Write-Host "✅ MongoDB 工具: $mongoVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装 MongoDB 工具" -ForegroundColor Red
    Write-Host "💡 请安装 MongoDB Database Tools" -ForegroundColor Yellow
    exit 1
}

# 验证参数
if ([string]::IsNullOrEmpty($WeChatEnvId)) {
    Write-Host "❌ 请提供微信云开发环境 ID" -ForegroundColor Red
    Write-Host "💡 使用: -WeChatEnvId your-env-id" -ForegroundColor Yellow
    exit 1
}

if ([string]::IsNullOrEmpty($MongoDBUri)) {
    Write-Host "❌ 请提供 MongoDB 连接字符串" -ForegroundColor Red
    Write-Host "💡 设置环境变量 MONGODB_URI 或使用 -MongoDBUri" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 环境检查通过" -ForegroundColor Green

# 登录微信云开发
Write-Host "🔐 登录微信云开发..." -ForegroundColor Blue
if ($DryRun) {
    Write-Host "🔍 干运行: 跳过登录" -ForegroundColor Cyan
} else {
    tcb login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 微信云开发登录失败" -ForegroundColor Red
        exit 1
    }
}

# 定义要迁移的集合
$migrationCollections = @(
    @{ Name = "users"; Description = "用户数据" },
    @{ Name = "works"; Description = "AI作品数据" },
    @{ Name = "scenes"; Description = "摄影场景数据" },
    @{ Name = "prompts"; Description = "AI提示词模板" },
    @{ Name = "aimodels"; Description = "AI模型配置" },
    @{ Name = "orders"; Description = "订单数据" },
    @{ Name = "task_queue"; Description = "任务队列" },
    @{ Name = "user_settings"; Description = "用户设置" }
)

# 创建备份目录
$backupDir = "./migration-backup/$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "📁 备份目录: $backupDir" -ForegroundColor Cyan

# 迁移每个集合
$totalMigrated = 0
$totalErrors = 0

foreach ($collection in $migrationCollections) {
    $collectionName = $collection.Name
    $description = $collection.Description

    Write-Host ""
    Write-Host "🔄 迁移集合: $collectionName ($description)" -ForegroundColor Blue
    Write-Host "-----------------------------------" -ForegroundColor Gray

    if ($DryRun) {
        Write-Host "🔍 干运行: 将迁移 $collectionName 集合" -ForegroundColor Cyan
        continue
    }

    try {
        # 1. 从微信云开发导出数据
        Write-Host "📥 从微信云开发导出 $collectionName..." -ForegroundColor Yellow
        $exportFile = "$backupDir/$collectionName.json"

        tcb db export $collectionName --output $exportFile --env-id $WeChatEnvId

        if (-not (Test-Path $exportFile)) {
            Write-Host "⚠️  导出文件不存在，可能集合为空" -ForegroundColor Yellow
            continue
        }

        # 2. 检查导出文件
        $fileSize = (Get-Item $exportFile).Length
        Write-Host "📊 导出文件大小: $([math]::Round($fileSize / 1KB, 2)) KB" -ForegroundColor White

        if ($fileSize -eq 0) {
            Write-Host "⚠️  导出文件为空，跳过迁移" -ForegroundColor Yellow
            continue
        }

        # 3. 导入到 MongoDB
        Write-Host "📤 导入到 MongoDB $collectionName..." -ForegroundColor Yellow

        # 使用 mongoimport 导入数据
        $importResult = mongoimport `
            --uri $MongoDBUri `
            --collection $collectionName `
            --file $exportFile `
            --jsonArray `
            --drop 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $collectionName 迁移成功" -ForegroundColor Green

            # 尝试解析导入结果获取文档数量
            if ($importResult -match 'imported (\d+) documents') {
                $docCount = $matches[1]
                Write-Host "📊 导入文档数: $docCount" -ForegroundColor White
                $totalMigrated += [int]$docCount
            }
        } else {
            Write-Host "❌ $collectionName 迁移失败" -ForegroundColor Red
            Write-Host "错误信息: $importResult" -ForegroundColor Red
            $totalErrors++
        }

    } catch {
        Write-Host "❌ $collectionName 迁移过程中发生错误" -ForegroundColor Red
        Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
        $totalErrors++
    }
}

# 数据验证
if (-not $SkipValidation -and -not $DryRun) {
    Write-Host ""
    Write-Host "🔍 数据验证..." -ForegroundColor Blue

    foreach ($collection in $migrationCollections) {
        $collectionName = $collection.Name

        try {
            # 查询 MongoDB 中的文档数量
            $countResult = mongo --quiet --eval "
                db = db.getSiblingDB('ai-photography');
                var count = db.$collectionName.countDocuments();
                print(count);
            " "$MongoDBUri"

            if ($countResult -match '^\d+$') {
                $docCount = [int]$countResult
                Write-Host "📊 $collectionName`: $docCount 个文档" -ForegroundColor White
            }
        } catch {
            Write-Host "⚠️  无法验证 $collectionName" -ForegroundColor Yellow
        }
    }
}

# 迁移总结
Write-Host ""
Write-Host "=======================================" -ForegroundColor Yellow
Write-Host "📊 迁移总结" -ForegroundColor Blue
Write-Host "=======================================" -ForegroundColor Yellow

Write-Host "📁 备份位置: $backupDir" -ForegroundColor Cyan
Write-Host "📊 成功迁移集合: $($migrationCollections.Count - $totalErrors)/$($migrationCollections.Count)" -ForegroundColor Green
Write-Host "📄 总迁移文档: $totalMigrated" -ForegroundColor Green
Write-Host "❌ 错误数量: $totalErrors" -ForegroundColor $(if ($totalErrors -eq 0) { 'Green' } else { 'Red' })

if ($DryRun) {
    Write-Host "🔍 干运行完成 - 未实际迁移数据" -ForegroundColor Cyan
} else {
    if ($totalErrors -eq 0) {
        Write-Host "🎉 数据迁移成功完成！" -ForegroundColor Green
    } else {
        Write-Host "⚠️  数据迁移完成，但有错误" -ForegroundColor Yellow
    }
}

# 后续步骤
Write-Host ""
Write-Host "📝 后续步骤:" -ForegroundColor Yellow
Write-Host "1. 验证数据完整性" -ForegroundColor White
Write-Host "2. 更新应用程序配置" -ForegroundColor White
Write-Host "3. 测试新数据库连接" -ForegroundColor White
Write-Host "4. （可选）清理微信云开发数据" -ForegroundColor White

Write-Host ""
Write-Host "✨ 迁移脚本执行完成！" -ForegroundColor $(if ($totalErrors -eq 0) { 'Green' } else { 'Yellow' })
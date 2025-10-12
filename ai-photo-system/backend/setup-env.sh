#!/bin/bash
# Backend环境配置脚本
# 自动生成.env文件

echo "🚀 开始配置Backend环境..."

cd "$(dirname "$0")"

# 生成随机JWT密钥
JWT_SECRET=$(openssl rand -hex 32)

# 创建.env文件
cat > .env << EOF
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=ai_photo
DB_PASSWORD=Canbp3dFb5yPG28w
DB_NAME=ai_photo

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# 微信小程序配置
WECHAT_APP_ID=wx1ed34a87abfaa643
WECHAT_APP_SECRET=your-app-secret-change-later

# n8n配置
N8N_WEBHOOK_BASE_URL=http://localhost:5678/webhook
N8N_FITTING_WEBHOOK=fitting-batch
N8N_PHOTOGRAPHY_WEBHOOK=photography-batch
N8N_NOTIFICATION_WEBHOOK=notification

# AI API配置
AI_API_URL=https://apis.kuai.host/v1beta/models/gemini-2.5-flash-image-preview:generateContent
AI_API_KEY_1=sk-RG8U9pINNX8KTWhZxxxyfPzwTRUfRtXYtmdscR5ePPkhS2vq
AI_API_KEY_2=sk-YTwey3gMGW7MyTfkyqilk6OLp6hZbBCzutbVNFVVtFOAhzS9

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg

# WebSocket配置
WS_PORT=3001

# 批处理配置
MAX_BATCH_COUNT=50
DEFAULT_BATCH_COUNT=10
QUEUE_CONCURRENCY=5

# 系统配置
DEFAULT_USER_CREDITS=10

# 日志配置
LOG_LEVEL=info

# Sentry错误追踪（可选）
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# 备份配置
BACKUP_DIR=./backups
MAX_BACKUPS=30
MAX_FILE_BACKUPS=7
EOF

echo "✅ .env文件已创建！"
echo ""
echo "📋 配置信息："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "端口: 3000"
echo "数据库: ai_photo"
echo "Redis: localhost:6379"
echo "JWT密钥: $JWT_SECRET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 环境配置完成！"

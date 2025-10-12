#!/bin/bash
# 启动Next.js Web前端服务

echo "🚀 启动Web前端服务..."

# 进入web目录
cd /www/wwwroot/2.0/ai-photo-system/web

# 设置Node.js环境
export PATH=/www/server/nodejs/v18.19.1/bin:$PATH

# 设置环境变量（使用本地API）
export NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
export NEXT_PUBLIC_WS_URL=ws://localhost:3001
export PORT=3002

# 使用PM2启动Next.js standalone服务器
pm2 start .next/standalone/server.js \
  --name ai-photo-web \
  --env production \
  --log /www/wwwlogs/ai-photo-web.log \
  --error /www/wwwlogs/ai-photo-web-error.log

# 保存PM2配置
pm2 save

echo ""
echo "✅ Web前端服务已启动在端口 3002"
echo ""
echo "查看状态: pm2 status"
echo "查看日志: pm2 logs ai-photo-web"

#!/bin/bash
# Nginx配置部署脚本

echo "🚀 开始部署Nginx配置..."
echo ""

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
   echo "❌ 请使用root用户执行此脚本"
   exit 1
fi

# 1. 备份现有配置（如果存在）
if [ -f /etc/nginx/conf.d/ai-photo.conf ]; then
    echo "📦 备份现有配置..."
    cp /etc/nginx/conf.d/ai-photo.conf /etc/nginx/conf.d/ai-photo.conf.backup.$(date +%Y%m%d_%H%M%S)
fi

# 2. 复制新配置
echo "📝 部署Nginx配置..."
cp $(dirname "$0")/nginx-config.conf /etc/nginx/conf.d/ai-photo.conf

# 3. 创建日志目录
mkdir -p /www/wwwlogs
chmod 755 /www/wwwlogs

# 4. 测试Nginx配置
echo ""
echo "🔍 测试Nginx配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Nginx配置测试通过！"

    # 5. 重载Nginx
    echo "🔄 重载Nginx..."
    nginx -s reload || systemctl reload nginx

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Nginx配置部署成功！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 服务地址："
    echo "   Web前端:    http://YOUR_IP/"
    echo "   管理后台:    http://YOUR_IP/admin"
    echo "   Backend API: http://YOUR_IP/api/"
    echo "   WebSocket:   ws://YOUR_IP/ws"
    echo "   健康检查:    http://YOUR_IP/health"
    echo ""
    echo "🔍 查看Nginx状态: systemctl status nginx"
    echo "📊 查看访问日志: tail -f /www/wwwlogs/ai-photo-access.log"
    echo "❌ 查看错误日志: tail -f /www/wwwlogs/ai-photo-error.log"
    echo ""
else
    echo ""
    echo "❌ Nginx配置测试失败！请检查配置文件"
    exit 1
fi

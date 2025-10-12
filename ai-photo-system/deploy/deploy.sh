#!/bin/bash
# AI摄影系统一键部署脚本

set -e

echo "==================================="
echo "   AI摄影系统 - 一键部署脚本"
echo "==================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用root用户运行此脚本${NC}"
  exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${GREEN}项目目录: $PROJECT_ROOT${NC}"
echo ""

# 1. 检查系统环境
echo ">>> 步骤1: 检查系统环境"

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js未安装${NC}"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm未安装${NC}"
  exit 1
fi

if ! command -v mysql &> /dev/null; then
  echo -e "${YELLOW}⚠️  MySQL未找到，请确保MySQL已安装${NC}"
fi

if ! command -v redis-cli &> /dev/null; then
  echo -e "${YELLOW}⚠️  Redis未找到，请确保Redis已安装${NC}"
fi

if ! command -v nginx &> /dev/null; then
  echo -e "${YELLOW}⚠️  Nginx未找到，将跳过Nginx配置${NC}"
fi

echo -e "${GREEN}✓ 环境检查完成${NC}"
echo ""

# 2. 初始化数据库
echo ">>> 步骤2: 初始化数据库"

read -p "是否需要初始化数据库? (y/n): " init_db
if [ "$init_db" = "y" ]; then
  read -p "MySQL用户名 [ai_photo]: " db_user
  db_user=${db_user:-ai_photo}

  read -sp "MySQL密码: " db_password
  echo ""

  read -p "数据库名 [ai_photo]: " db_name
  db_name=${db_name:-ai_photo}

  echo "正在初始化数据库..."
  mysql -u "$db_user" -p"$db_password" "$db_name" < "$PROJECT_ROOT/database/init.sql"

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 数据库初始化成功${NC}"
  else
    echo -e "${RED}❌ 数据库初始化失败${NC}"
    exit 1
  fi
fi
echo ""

# 3. 部署后端API
echo ">>> 步骤3: 部署后端API"

cd "$PROJECT_ROOT/backend"

if [ ! -f ".env" ]; then
  echo "正在创建.env文件..."
  cp .env.example .env
  echo -e "${YELLOW}⚠️  请编辑 backend/.env 配置文件${NC}"
  read -p "按Enter继续..."
fi

echo "正在安装依赖..."
npm install --production

echo "正在启动后端服务..."
if command -v pm2 &> /dev/null; then
  pm2 delete ai-photo-backend 2>/dev/null || true
  pm2 start src/app.js --name ai-photo-backend
  pm2 save
  echo -e "${GREEN}✓ 后端服务已启动 (PM2)${NC}"
else
  echo -e "${YELLOW}⚠️  PM2未安装，请手动启动: npm start${NC}"
fi
echo ""

# 4. 部署管理后台
echo ">>> 步骤4: 部署管理后台"

read -p "管理后台部署路径 [/var/www/ai-photo-admin]: " admin_path
admin_path=${admin_path:-/var/www/ai-photo-admin}

mkdir -p "$admin_path"
cp -r "$PROJECT_ROOT/admin/"* "$admin_path/"

# 修改API地址
read -p "后端API地址 [http://localhost:3000/api]: " api_url
api_url=${api_url:-http://localhost:3000/api}

sed -i "s|const API_BASE_URL = .*|const API_BASE_URL = '$api_url';|g" "$admin_path/assets/js/common.js"

echo -e "${GREEN}✓ 管理后台已部署到: $admin_path${NC}"
echo ""

# 5. 部署网页版
echo ">>> 步骤5: 部署网页版"

cd "$PROJECT_ROOT/web"

if [ ! -f ".env.local" ]; then
  echo "正在创建.env.local文件..."
  cp .env.example .env.local
  echo -e "${YELLOW}⚠️  请编辑 web/.env.local 配置文件${NC}"
  read -p "按Enter继续..."
fi

echo "正在安装依赖..."
npm install

echo "正在构建..."
npm run build

echo "正在启动网页版..."
if command -v pm2 &> /dev/null; then
  pm2 delete ai-photo-web 2>/dev/null || true
  pm2 start npm --name ai-photo-web -- start
  pm2 save
  echo -e "${GREEN}✓ 网页版已启动 (PM2)${NC}"
else
  echo -e "${YELLOW}⚠️  PM2未安装，请手动启动: npm start${NC}"
fi
echo ""

# 6. 配置Nginx
echo ">>> 步骤6: 配置Nginx"

if command -v nginx &> /dev/null; then
  read -p "是否配置Nginx? (y/n): " config_nginx
  if [ "$config_nginx" = "y" ]; then
    read -p "管理后台域名 [admin.yourdomain.com]: " admin_domain
    admin_domain=${admin_domain:-admin.yourdomain.com}

    read -p "网页版域名 [app.yourdomain.com]: " web_domain
    web_domain=${web_domain:-app.yourdomain.com}

    # 生成管理后台配置
    cat > "/etc/nginx/sites-available/ai-photo-admin" <<EOF
server {
    listen 80;
    server_name $admin_domain;

    root $admin_path;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # 生成网页版配置
    cat > "/etc/nginx/sites-available/ai-photo-web" <<EOF
server {
    listen 80;
    server_name $web_domain;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # 启用站点
    ln -sf /etc/nginx/sites-available/ai-photo-admin /etc/nginx/sites-enabled/
    ln -sf /etc/nginx/sites-available/ai-photo-web /etc/nginx/sites-enabled/

    # 测试配置
    nginx -t

    if [ $? -eq 0 ]; then
      systemctl reload nginx
      echo -e "${GREEN}✓ Nginx配置成功${NC}"
      echo -e "管理后台: http://$admin_domain"
      echo -e "网页版: http://$web_domain"
    else
      echo -e "${RED}❌ Nginx配置测试失败${NC}"
    fi
  fi
fi
echo ""

# 7. n8n部署提示
echo ">>> 步骤7: n8n工作流"
echo -e "${YELLOW}请手动配置n8n:${NC}"
echo "1. 安装n8n: npm install -g n8n"
echo "2. 启动n8n: n8n start"
echo "3. 访问 http://localhost:5678"
echo "4. 导入工作流: $PROJECT_ROOT/n8n-workflows/*.json"
echo "5. 配置环境变量和API Key"
echo ""

# 完成
echo "==================================="
echo -e "${GREEN}   部署完成！${NC}"
echo "==================================="
echo ""
echo "服务访问地址:"
echo "- 后端API: http://localhost:3000"
echo "- 管理后台: http://localhost (或配置的域名)"
echo "- 网页版: http://localhost:3001 (或配置的域名)"
echo "- n8n: http://localhost:5678"
echo ""
echo "查看日志:"
echo "- 后端: pm2 logs ai-photo-backend"
echo "- 网页版: pm2 logs ai-photo-web"
echo ""
echo "默认管理员账号:"
echo "- 用户名: admin"
echo "- 密码: admin123"
echo ""
echo -e "${YELLOW}⚠️  重要提示:${NC}"
echo "1. 请立即修改默认管理员密码"
echo "2. 配置WECHAT_APP_SECRET (backend/.env)"
echo "3. 配置n8n工作流和API Key"
echo "4. 生产环境请使用HTTPS"
echo ""

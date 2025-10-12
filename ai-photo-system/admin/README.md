# AI摄影系统 - 管理后台

基于HTML + Bootstrap + jQuery的简洁管理后台。

## 📁 文件结构

```
admin/
├── assets/
│   ├── css/
│   │   └── style.css        # 全局样式
│   └── js/
│       └── common.js         # 公共JS函数
├── index.html                # 仪表板
├── login.html                # 登录页
├── users.html                # 用户管理
├── works.html                # 作品管理
├── tasks.html                # 任务监控
├── scenes.html               # 场景管理
├── orders.html               # 订单管理
├── config.html               # 系统配置
└── README.md                 # 说明文档
```

## 🚀 部署说明

### 方式一：Nginx部署

1. 将admin目录复制到服务器

2. 配置Nginx:
```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;

    root /path/to/admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理（如果需要）
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. 重启Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 方式二：使用Baota面板

1. 在宝塔面板创建新站点
2. 将admin目录上传到站点根目录
3. 配置反向代理（如果后端在同服务器）

### 方式三：本地测试

使用Python简单HTTP服务器：

```bash
cd admin
python3 -m http.server 8080
```

访问: http://localhost:8080

## ⚙️ 配置

修改 `assets/js/common.js` 中的API地址：

```javascript
const API_BASE_URL = 'http://your-backend-url/api';
```

## 🔐 默认账号

- 用户名: `admin`
- 密码: `admin123`

**注意**: 首次部署后请立即修改默认密码！

## 功能说明

### 1. 仪表板 (index.html)

- 显示系统统计数据
- 用户数、作品数、任务数、收入统计
- 最近作品列表
- 实时数据刷新（每30秒）

### 2. 用户管理 (users.html)

- 用户列表查看
- 搜索用户（昵称、OpenID）
- 查看用户详情
- 调整用户积分
- 修改用户角色
- 禁用/启用用户

### 3. 作品管理 (works.html)

- 作品列表查看
- 按类型筛选（试衣间/摄影/旅行）
- 按状态筛选
- 查看作品详情
- 删除作品
- 批量操作

### 4. 任务监控 (tasks.html)

- 实时任务列表
- 任务状态监控
- 队列统计信息
- 失败任务查看
- 任务重试功能

### 5. 场景管理 (scenes.html)

- 场景列表
- 新增场景
- 编辑场景
- 删除场景
- 场景分类管理

### 6. 订单管理 (orders.html)

- 订单列表
- 按状态筛选
- 订单详情查看
- 收入统计

### 7. 系统配置 (config.html)

- 系统参数配置
- 积分配置
- 上传限制配置
- 批处理配置

## 🎨 UI组件

### 统计卡片

```html
<div class="stat-card primary">
  <div class="stat-card-content">
    <h3>1234</h3>
    <p>标题</p>
  </div>
  <div class="stat-card-icon">
    <i class="fas fa-icon"></i>
  </div>
</div>
```

### 表格容器

```html
<div class="table-container">
  <div class="table-header">
    <h2>表格标题</h2>
    <div class="table-actions">
      <button class="btn btn-primary">操作</button>
    </div>
  </div>
  <div class="table-responsive">
    <table>
      <!-- 表格内容 -->
    </table>
  </div>
</div>
```

### 状态徽章

```html
<span class="badge badge-success">成功</span>
<span class="badge badge-danger">失败</span>
<span class="badge badge-warning">警告</span>
<span class="badge badge-info">信息</span>
```

## 📱 响应式设计

管理后台支持响应式布局：

- 桌面端：完整侧边栏 + 主内容区
- 平板：收缩侧边栏
- 手机：隐藏侧边栏，点击按钮显示

## 🔧 自定义开发

### 添加新页面

1. 复制现有HTML页面为模板
2. 修改页面标题和内容
3. 在侧边栏菜单添加链接

### 调用API

使用封装的http对象：

```javascript
// GET请求
const result = await http.get('/admin/users', { page: 1 });

// POST请求
const result = await http.post('/admin/users', { username: 'test' });

// PUT请求
const result = await http.put('/admin/users/123', { role: 'vip' });

// DELETE请求
const result = await http.delete('/admin/users/123');
```

### 显示加载动画

```javascript
utils.showLoading();
// 执行操作
utils.hideLoading();
```

### 格式化工具

```javascript
// 格式化日期
utils.formatDate('2024-01-01T00:00:00.000Z');

// 格式化数字
utils.formatNumber(12345); // "12,345"

// 格式化文件大小
utils.formatFileSize(1024000); // "1000 KB"

// 获取状态徽章
utils.getStatusBadge('completed'); // HTML badge
```

## 🔒 安全建议

1. **使用HTTPS**: 生产环境必须使用HTTPS
2. **修改默认密码**: 立即修改默认管理员密码
3. **IP白名单**: 限制管理后台访问IP
4. **定期备份**: 定期备份数据库
5. **监控日志**: 定期查看访问日志

## 📊 性能优化

1. **CDN加速**: 使用CDN加载Bootstrap和Font Awesome
2. **图片优化**: 压缩图片资源
3. **缓存策略**: 配置Nginx缓存静态资源
4. **异步加载**: 使用异步方式加载数据

## 🐛 常见问题

### 无法登录

- 检查后端API是否运行
- 检查API_BASE_URL配置
- 查看浏览器控制台错误信息

### API请求失败

- 检查CORS配置
- 检查Token是否过期
- 检查网络连接

### 样式显示异常

- 清除浏览器缓存
- 检查CDN是否可访问
- 检查CSS文件路径

## 📝 更新日志

### v1.0.0 (2024-10-12)

- 初始版本发布
- 完整管理功能
- 响应式设计
- 数据可视化

## 🤝 技术支持

如有问题，请查看：
- 后端API文档
- 系统部署文档
- FAQ常见问题

## 📄 许可证

MIT License

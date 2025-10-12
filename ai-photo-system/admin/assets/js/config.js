// AI摄影系统 - 管理后台配置文件

// API基础URL配置
// 生产环境：使用相对路径或完整域名
// 开发环境：使用localhost
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api'; // 生产环境使用相对路径，通过Nginx反向代理

// 导出配置
window.APP_CONFIG = {
  API_BASE_URL: API_BASE_URL
};

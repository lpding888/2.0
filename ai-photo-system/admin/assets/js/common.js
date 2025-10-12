// AI摄影系统 - 管理后台公共JS

// API基础URL（从配置文件读取）
const API_BASE_URL = window.APP_CONFIG ? window.APP_CONFIG.API_BASE_URL : 'http://localhost:3000/api';

// 全局配置
const config = {
  token: localStorage.getItem('admin_token') || '',
  admin: JSON.parse(localStorage.getItem('admin_info') || 'null')
};

// HTTP请求封装
const http = {
  // GET请求
  async get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${API_BASE_URL}${url}${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });

      return await this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  },

  // POST请求
  async post(url, data = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      return await this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  },

  // PUT请求
  async put(url, data = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      return await this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  },

  // DELETE请求
  async delete(url) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });

      return await this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  },

  // 处理响应
  async handleResponse(response) {
    const data = await response.json();

    if (response.status === 401) {
      alert('登录已过期，请重新登录');
      this.logout();
      return null;
    }

    if (!response.ok && response.status !== 401) {
      throw new Error(data.message || '请求失败');
    }

    return data;
  },

  // 处理错误
  handleError(error) {
    console.error('请求错误:', error);
    alert(error.message || '网络请求失败');
    return null;
  },

  // 退出登录
  logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    window.location.href = '/admin/login.html';
  }
};

// 工具函数
const utils = {
  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // 格式化数字
  formatNumber(number) {
    if (number === null || number === undefined) return '0';
    return number.toLocaleString('zh-CN');
  },

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  // 获取状态徽章HTML
  getStatusBadge(status) {
    const badges = {
      'active': '<span class="badge badge-success">激活</span>',
      'inactive': '<span class="badge badge-secondary">禁用</span>',
      'pending': '<span class="badge badge-warning">待处理</span>',
      'processing': '<span class="badge badge-info">处理中</span>',
      'completed': '<span class="badge badge-success">已完成</span>',
      'failed': '<span class="badge badge-danger">失败</span>',
      'cancelled': '<span class="badge badge-secondary">已取消</span>',
      'paid': '<span class="badge badge-success">已支付</span>'
    };
    return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
  },

  // 显示加载动画
  showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
  },

  // 隐藏加载动画
  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  },

  // 确认对话框
  async confirm(message) {
    return window.confirm(message);
  },

  // 防抖函数
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// 分页组件
class Pagination {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.currentPage = options.currentPage || 1;
    this.totalPages = options.totalPages || 1;
    this.onPageChange = options.onPageChange || (() => {});
  }

  render() {
    if (!this.container) return;

    const pages = [];
    const maxPages = 5;

    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    // 上一页
    if (this.currentPage > 1) {
      pages.push(`<li class="page-item"><a class="page-link" href="#" data-page="${this.currentPage - 1}">上一页</a></li>`);
    }

    // 页码
    for (let i = startPage; i <= endPage; i++) {
      const active = i === this.currentPage ? 'active' : '';
      pages.push(`<li class="page-item ${active}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`);
    }

    // 下一页
    if (this.currentPage < this.totalPages) {
      pages.push(`<li class="page-item"><a class="page-link" href="#" data-page="${this.currentPage + 1}">下一页</a></li>`);
    }

    this.container.innerHTML = `<ul class="pagination">${pages.join('')}</ul>`;

    // 绑定事件
    this.container.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(e.target.dataset.page);
        this.currentPage = page;
        this.onPageChange(page);
        this.render();
      });
    });
  }

  update(currentPage, totalPages) {
    this.currentPage = currentPage;
    this.totalPages = totalPages;
    this.render();
  }
}

// 检查登录状态
function checkAuth() {
  if (!config.token) {
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

// 退出登录
function logout() {
  if (confirm('确定要退出登录吗？')) {
    http.logout();
  }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
  // 如果不是登录页，检查登录状态
  if (!window.location.pathname.includes('login.html')) {
    checkAuth();

    // 显示管理员信息
    if (config.admin) {
      const userInfoElement = document.querySelector('.user-info .user-name');
      if (userInfoElement) {
        userInfoElement.textContent = config.admin.nickname || config.admin.username;
      }
    }

    // 高亮当前菜单
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
      if (link.getAttribute('href') === currentPath.split('/').pop()) {
        link.classList.add('active');
      }
    });
  }
});

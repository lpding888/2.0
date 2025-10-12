// API请求封装
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2分钟超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加Token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error: AxiosError<any>) => {
    // 处理错误
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        // 未授权，跳转登录
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        toast.error('登录已过期，请重新登录');
      } else if (status === 403) {
        toast.error('没有权限访问该资源');
      } else if (status === 404) {
        toast.error('请求的资源不存在');
      } else if (status === 500) {
        toast.error(data.message || '服务器错误');
      } else {
        toast.error(data.message || '请求失败');
      }
    } else if (error.request) {
      toast.error('网络连接失败，请检查网络');
    } else {
      toast.error(error.message || '请求失败');
    }

    return Promise.reject(error);
  }
);

// API方法
export const apiClient = {
  // GET请求
  get: <T = any>(url: string, config?: AxiosRequestConfig) => {
    return api.get<T, T>(url, config);
  },

  // POST请求
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    return api.post<T, T>(url, data, config);
  },

  // PUT请求
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    return api.put<T, T>(url, data, config);
  },

  // DELETE请求
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => {
    return api.delete<T, T>(url, config);
  },

  // 上传文件
  upload: async (url: string, formData: FormData, onProgress?: (progress: number) => void) => {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },
};

// 具体业务API
export const authAPI = {
  // 微信扫码登录
  wechatLogin: (code: string, userInfo?: any) => {
    return apiClient.post('/auth/wechat/login', { code, userInfo });
  },

  // 获取当前用户信息
  getCurrentUser: () => {
    return apiClient.get('/auth/me');
  },

  // 刷新Token
  refreshToken: () => {
    return apiClient.post('/auth/refresh');
  },
};

export const worksAPI = {
  // 获取作品列表
  getWorks: (params: any) => {
    return apiClient.get('/works', { params });
  },

  // 获取作品详情
  getWorkDetail: (workId: string) => {
    return apiClient.get(`/works/${workId}`);
  },

  // 更新作品
  updateWork: (workId: string, data: any) => {
    return apiClient.put(`/works/${workId}`, data);
  },

  // 删除作品
  deleteWork: (workId: string) => {
    return apiClient.delete(`/works/${workId}`);
  },

  // 批量删除作品
  batchDeleteWorks: (workIds: string[]) => {
    return apiClient.post('/works/batch/delete', { work_ids: workIds });
  },
};

export const tasksAPI = {
  // 创建任务
  createTask: (data: any) => {
    return apiClient.post('/tasks/create', data);
  },
  create: (data: any) => {
    return apiClient.post('/tasks/create', data);
  },

  // 获取任务状态
  getTaskStatus: (taskId: string) => {
    return apiClient.get(`/tasks/${taskId}`);
  },

  // 获取任务列表
  getUserTasks: (params: any) => {
    return apiClient.get('/tasks/user/list', { params });
  },

  // 取消任务
  cancelTask: (taskId: string) => {
    return apiClient.post(`/tasks/${taskId}/cancel`);
  },
  cancel: (taskId: string) => {
    return apiClient.post(`/tasks/${taskId}/cancel`);
  },
};

export const scenesAPI = {
  // 获取场景列表
  getScenes: (params?: any) => {
    return apiClient.get('/scenes', { params });
  },
  list: (params?: any) => {
    return apiClient.get('/scenes', { params });
  },

  // 获取场景详情
  getSceneDetail: (sceneId: string) => {
    return apiClient.get(`/scenes/${sceneId}`);
  },
};

export const uploadAPI = {
  // 上传单个文件
  uploadSingle: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload('/upload/single', formData, onProgress);
  },
  single: (formData: FormData, onProgress?: (progress: number) => void) => {
    return apiClient.upload('/upload/single', formData, onProgress);
  },

  // 上传多个文件
  uploadMultiple: (files: File[], onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return apiClient.upload('/upload/multiple', formData, onProgress);
  },

  // Base64批量上传
  uploadBase64Batch: (images: string[]) => {
    return apiClient.post('/upload/base64/batch', { images, subDir: 'users' });
  },
};

export const creditsAPI = {
  // 获取积分余额
  getBalance: () => {
    return apiClient.get('/credits/balance');
  },

  // 获取积分记录
  getRecords: (params: any) => {
    return apiClient.get('/credits/records', { params });
  },

  // 获取充值套餐
  getPackages: () => {
    return apiClient.get('/credits/packages');
  },

  // 创建充值订单
  createRechargeOrder: (packageId: string) => {
    return apiClient.post('/credits/recharge', { package_id: packageId });
  },
};

export default api;

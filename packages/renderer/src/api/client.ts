import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إرفاق token في كل طلب
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lexpro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// التعامل مع 401 (انتهاء الجلسة)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lexpro_token');
      localStorage.removeItem('lexpro_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// مسارات الملفات
export const fileApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getUrl: (id: string) => `${API_BASE_URL}/files/${id}`,
};

// مسارات المصادقة
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; avatar?: string }) =>
    api.put('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
};

// مسارات المستخدمين
export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  updatePermissions: (id: string, permissions: any[]) => api.put(`/users/${id}/permissions`, { permissions }),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// مسارات سجل النشاط
export const activityApi = {
  getAll: () => api.get('/activity-logs'),
  markRead: () => api.put('/activity-logs/read'),
};

// مسارات الدردشة
export const chatApi = {
  getOnlineUsers: () => api.get('/auth/online-users'),
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId: string) => api.get(`/messages/${userId}`),
  sendMessage: (receiverId: string, text: string) => api.post('/messages', { receiverId, text }),
};

// مسارات عامة CRUD
export function createCrudApi<T>(endpoint: string) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return {
    getAll: () => api.get(path),
    getById: (id: string) => api.get(`${path}/${id}`),
    create: (data: Partial<T>) => api.post(path, data),
    update: (id: string, data: Partial<T>) => api.put(`${path}/${id}`, data),
    delete: (id: string) => api.delete(`${path}/${id}`),
  };
}

export default api;

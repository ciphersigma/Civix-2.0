import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/admin';
        }
        return Promise.reject(error);
      }
    );
  }

  async adminLogin(email: string, password: string) {
    return this.client.post('/auth/admin/login', { email, password });
  }

  async getStats() {
    return this.client.get('/admin/stats');
  }

  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    return this.client.get('/admin/users', { params });
  }

  async getReports(params?: { page?: number; limit?: number; severity?: string; status?: string }) {
    return this.client.get('/admin/reports', { params });
  }

  async getReportsTimeline() {
    return this.client.get('/admin/reports/timeline');
  }

  async getReportsByArea(lat: number, lng: number, radius: number) {
    return this.client.get('/reports/area', { params: { lat, lng, radius } });
  }

  async getPublicReports() {
    return this.client.get('/reports/public');
  }

  async getHeatmap(days: number = 90) {
    return this.client.get('/reports/heatmap', { params: { days } });
  }

  async getHeatmapTimeline(days: number = 30) {
    return this.client.get('/reports/heatmap/timeline', { params: { days } });
  }

  async updateUser(id: string, data: { full_name?: string; email?: string; phone_number?: string; phone_verified?: boolean; language?: string }) {
    return this.client.put(`/admin/users/${id}`, data);
  }

  async deleteUser(id: string) {
    return this.client.delete(`/admin/users/${id}`);
  }

  async getFeedback() {
    return this.client.get('/feedback');
  }

  async submitFeedback(data: { name: string; email?: string; type: string; message: string }) {
    return this.client.post('/feedback', data);
  }

  async deleteFeedback(id: number) {
    return this.client.delete(`/feedback/${id}`);
  }

  // API Keys
  async getApiKeys() {
    return this.client.get('/admin/api-keys');
  }

  async createApiKey(data: { partnerName: string; permissions?: string[]; rateLimit?: number; webhookUrl?: string; expiresAt?: string }) {
    return this.client.post('/admin/api-keys', data);
  }

  async updateApiKey(id: string, data: { partnerName?: string; permissions?: string[]; rateLimit?: number; isActive?: boolean; webhookUrl?: string; expiresAt?: string }) {
    return this.client.put(`/admin/api-keys/${id}`, data);
  }

  async deleteApiKey(id: string) {
    return this.client.delete(`/admin/api-keys/${id}`);
  }

  async getApiKeyUsage(id: string) {
    return this.client.get(`/admin/api-keys/${id}/usage`);
  }

  async regenerateApiSecret(id: string) {
    return this.client.post(`/admin/api-keys/${id}/regenerate`);
  }

  // Weather Dashboard
  async getWeatherStats() {
    return this.client.get('/admin/weather/stats');
  }

  async getWeatherNotifications(params?: { page?: number; limit?: number }) {
    return this.client.get('/admin/weather/notifications', { params });
  }

  async triggerWeatherCheck() {
    return this.client.post('/admin/weather/trigger');
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new ApiService();

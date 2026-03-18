import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use production Vercel backend URL
// For local dev testing, change to: 'http://<YOUR_LOCAL_IP>:3000/api/v1'
const API_BASE_URL = 'https://civix-2-0.vercel.app/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      console.log('Server not reachable - using offline mode');
      return Promise.reject({ offline: true, originalError: error });
    }
    return Promise.reject(error);
  }
);

export { api };

import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production: Change this to your Vercel backend URL after deploying
// e.g. 'https://waterlogging-api.vercel.app/api/v1'
// For local dev: 'http://192.168.1.8:3000/api/v1'
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.8:3000/api/v1'
  : 'http://192.168.1.8:3000/api/v1'; // ← Replace with Vercel URL after deploy

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

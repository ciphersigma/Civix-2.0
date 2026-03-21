import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@auth_data';

interface AuthData {
  token: string;
  userId: string;
  email: string;
  fullName?: string;
}

export class AuthService {
  /**
   * Register — sends email OTP
   */
  static async register(email: string, fullName?: string): Promise<{ userId: string }> {
    const res = await api.post('/auth/register', { email, fullName });
    return { userId: res.data.userId };
  }

  /**
   * Login — sends email OTP (only if account exists)
   */
  static async login(email: string): Promise<{ userId: string }> {
    const res = await api.post('/auth/login', { email });
    return { userId: res.data.userId };
  }

  /**
   * Verify OTP code
   */
  static async verifyOTP(email: string, code: string, fullName?: string): Promise<AuthData> {
    const res = await api.post('/auth/verify', { email, code });
    const { token, userId } = res.data;
    const authData: AuthData = { token, userId, email, fullName };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    await AsyncStorage.setItem('authToken', token);
    return authData;
  }

  static async getAuthData(): Promise<AuthData | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  static async isAuthenticated(): Promise<boolean> {
    return (await this.getAuthData()) !== null;
  }

  static async isOfflineMode(): Promise<boolean> {
    return (await this.getAuthData()) === null;
  }

  static async logout(): Promise<void> {
    await AsyncStorage.multiRemove([STORAGE_KEY, 'authToken']);
  }
}

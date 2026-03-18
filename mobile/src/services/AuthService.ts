import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@auth_data';

interface AuthData {
  token: string;
  userId: string;
  phone: string;
  fullName?: string;
  email?: string;
}

export class AuthService {
  /**
   * Login — request OTP for existing user only
   */
  static async login(phoneNumber: string): Promise<{ userId: string; message: string }> {
    try {
      const response = await api.post('/auth/login', { phoneNumber });
      return response.data;
    } catch (error: any) {
      if (error.offline) {
        return { userId: `offline_${Date.now()}`, message: 'Offline mode — OTP skipped' };
      }
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  /**
   * Register / request OTP — calls backend POST /api/v1/auth/register
   * Backend sends SMS via Twilio and returns userId
   */
  static async requestOTP(phoneNumber: string, fullName?: string, email?: string): Promise<{ userId: string; message: string }> {
    try {
      const response = await api.post('/auth/register', { phoneNumber, fullName, email });
      return response.data;
    } catch (error: any) {
      if (error.offline) {
        // Offline fallback
        return { userId: `offline_${Date.now()}`, message: 'Offline mode — OTP skipped' };
      }
      throw new Error(error.response?.data?.message || 'Failed to send OTP');
    }
  }

  /**
   * Verify OTP — calls backend POST /api/v1/auth/verify
   * Returns JWT token on success
   */
  static async verifyOTP(phoneNumber: string, code: string): Promise<AuthData> {
    try {
      const response = await api.post('/auth/verify', { phoneNumber, code });
      const { token, userId } = response.data;

      const authData: AuthData = { token, userId, phone: phoneNumber };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.removeItem('isOfflineMode');

      return authData;
    } catch (error: any) {
      if (error.offline) {
        const offlineData: AuthData = {
          token: `offline_${Date.now()}`,
          userId: `offline_${Date.now()}`,
          phone: phoneNumber,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(offlineData));
        await AsyncStorage.setItem('authToken', offlineData.token);
        await AsyncStorage.setItem('isOfflineMode', 'true');
        return offlineData;
      }
      throw new Error(error.response?.data?.message || 'Verification failed');
    }
  }

  static async getAuthData(): Promise<AuthData | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    return (await this.getAuthData()) !== null;
  }

  static async isOfflineMode(): Promise<boolean> {
    return (await AsyncStorage.getItem('isOfflineMode')) === 'true';
  }

  static async logout(): Promise<void> {
    await AsyncStorage.multiRemove([STORAGE_KEY, 'authToken', 'isOfflineMode']);
  }
}

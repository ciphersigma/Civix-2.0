import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
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
   * Send OTP via Firebase Phone Auth
   * Returns a confirmation object to verify the code later
   */
  static async sendOTP(
    phoneNumber: string,
  ): Promise<FirebaseAuthTypes.ConfirmationResult> {
    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    return confirmation;
  }

  /**
   * Verify OTP code using Firebase confirmation object,
   * then sync user with our backend
   */
  static async verifyOTP(
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
    phoneNumber: string,
    fullName?: string,
    email?: string,
  ): Promise<AuthData> {
    // Verify with Firebase
    const userCredential = await confirmation.confirm(code);
    if (!userCredential?.user) {
      throw new Error('Verification failed');
    }

    // Get Firebase ID token
    const firebaseToken = await userCredential.user.getIdToken();

    // Sync with our backend — send Firebase token + profile info
    try {
      const response = await api.post('/auth/firebase-verify', {
        firebaseToken,
        phoneNumber,
        fullName,
        email,
      });

      const { token, userId } = response.data;
      const authData: AuthData = { token, userId, phone: phoneNumber, fullName, email };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.removeItem('isOfflineMode');
      return authData;
    } catch (error: any) {
      // If backend is down, use Firebase auth in offline mode
      if (error.offline || !error.response) {
        const offlineData: AuthData = {
          token: firebaseToken,
          userId: userCredential.user.uid,
          phone: phoneNumber,
          fullName,
          email,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(offlineData));
        await AsyncStorage.setItem('authToken', firebaseToken);
        await AsyncStorage.setItem('isOfflineMode', 'true');
        return offlineData;
      }
      throw new Error(error.response?.data?.message || 'Backend sync failed');
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
    try { await auth().signOut(); } catch {}
    await AsyncStorage.multiRemove([STORAGE_KEY, 'authToken', 'isOfflineMode']);
  }
}

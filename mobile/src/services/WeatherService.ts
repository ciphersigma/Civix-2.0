import { api } from './api';
import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = '@fcm_token_registered';

export class WeatherService {
  /**
   * Request notification permission and register FCM token with backend
   */
  static async registerForPushNotifications(): Promise<boolean> {
    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('[Weather] Notification permission denied');
        return false;
      }

      // Get FCM token
      const fcmToken = await messaging().getToken();
      if (!fcmToken) {
        console.log('[Weather] Failed to get FCM token');
        return false;
      }

      // Register with backend
      await api.post('/weather/register-token', { fcmToken });
      await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
      console.log('[Weather] FCM token registered');

      // Listen for token refresh
      messaging().onTokenRefresh(async (newToken) => {
        try {
          await api.post('/weather/register-token', { fcmToken: newToken });
          await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
        } catch (e) {
          console.error('[Weather] Token refresh failed:', e);
        }
      });

      return true;
    } catch (error) {
      console.error('[Weather] Push registration error:', error);
      return false;
    }
  }

  /**
   * Update user's location on the backend for weather alerts
   */
  static async updateLocation(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }

      Geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await api.post('/weather/update-location', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          } catch (e) {
            console.error('[Weather] Location update failed:', e);
          }
        },
        (err) => console.error('[Weather] Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    } catch (e) {
      console.error('[Weather] updateLocation error:', e);
    }
  }

  /**
   * Get current weather for a location
   */
  static async getCurrentWeather(lat?: number, lng?: number): Promise<any> {
    try {
      const params: any = {};
      if (lat) params.lat = lat;
      if (lng) params.lng = lng;
      const res = await api.get('/weather/current', { params });
      return res.data.weather;
    } catch (e) {
      console.error('[Weather] Fetch weather error:', e);
      return null;
    }
  }

  /**
   * Get user's weather alerts
   */
  static async getAlerts(): Promise<any[]> {
    try {
      const res = await api.get('/weather/alerts');
      return res.data.alerts || [];
    } catch (e) {
      console.error('[Weather] Fetch alerts error:', e);
      return [];
    }
  }

  /**
   * Respond to a weather alert
   */
  static async respondToAlert(alertId: string, response: 'yes' | 'no'): Promise<boolean> {
    try {
      await api.post(`/weather/alerts/${alertId}/respond`, { response });
      return true;
    } catch (e) {
      console.error('[Weather] Respond error:', e);
      return false;
    }
  }

  /**
   * Toggle weather alerts preference
   */
  static async setAlertsEnabled(enabled: boolean): Promise<boolean> {
    try {
      await api.put('/weather/preferences', { enabled });
      return true;
    } catch (e) {
      console.error('[Weather] Preferences error:', e);
      return false;
    }
  }

  /**
   * Setup foreground notification handler
   */
  static setupForegroundHandler(onNotification: (title: string, body: string, data: any) => void) {
    return messaging().onMessage(async (remoteMessage) => {
      const { notification, data } = remoteMessage;
      if (notification) {
        onNotification(notification.title || 'Alert', notification.body || '', data || {});
      }
    });
  }

  /**
   * Setup background notification handler (call in index.js)
   */
  static setupBackgroundHandler() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[Weather] Background message:', remoteMessage.notification?.title);
    });
  }
}

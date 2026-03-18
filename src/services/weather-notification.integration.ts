import { WeatherService, RainfallEvent } from './weather.service';
import { NotificationService } from './notification.service';

/**
 * Integrates the WeatherService with the NotificationService.
 * When rainfall is detected, fetches affected users and triggers notifications.
 *
 * Requirements: 1.1 - Detect rainfall and notify users within 5 minutes
 */
export function setupWeatherNotificationIntegration(
  weatherService: WeatherService,
  notificationService: NotificationService,
): void {
  weatherService.onRainfall(async (events: RainfallEvent[]) => {
    for (const event of events) {
      try {
        const users = await weatherService.getAffectedUsers(event.latitude, event.longitude);

        if (users.length === 0) {
          console.log('[Integration] No affected users found for rainfall event');
          continue;
        }

        console.log(`[Integration] Sending rain notifications to ${users.length} users`);
        await notificationService.sendRainNotification(users);
      } catch (error) {
        console.error(
          '[Integration] Error in weather-notification flow:',
          error instanceof Error ? error.message : error,
        );
      }
    }
  });
}

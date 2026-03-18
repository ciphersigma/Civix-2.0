import { WeatherService, RainfallEvent, AffectedUser } from './weather.service';
import { NotificationService } from './notification.service';
import { setupWeatherNotificationIntegration } from './weather-notification.integration';

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('axios');

describe('Weather-Notification Integration', () => {
  let weatherService: WeatherService;
  let notificationService: NotificationService;

  beforeEach(() => {
    weatherService = new WeatherService();
    notificationService = new NotificationService();
    jest.restoreAllMocks();
  });

  describe('setupWeatherNotificationIntegration', () => {
    it('should register an onRainfall callback on the weather service', () => {
      const onRainfallSpy = jest.spyOn(weatherService, 'onRainfall');

      setupWeatherNotificationIntegration(weatherService, notificationService);

      expect(onRainfallSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should fetch affected users and send notifications when rainfall detected', async () => {
      const mockUsers: AffectedUser[] = [
        { id: 'user-1', phoneNumber: '+919876543210', language: 'en' },
      ];

      jest.spyOn(weatherService, 'getAffectedUsers').mockResolvedValue(mockUsers);
      jest.spyOn(notificationService, 'sendRainNotification').mockResolvedValue([]);

      setupWeatherNotificationIntegration(weatherService, notificationService);

      // Capture the registered callback
      const onRainfallSpy = jest.spyOn(weatherService, 'onRainfall');
      setupWeatherNotificationIntegration(weatherService, notificationService);
      const callback = onRainfallSpy.mock.calls[0][0];

      const events: RainfallEvent[] = [
        { latitude: 23.02, longitude: 72.57, precipitationMm: 5.0, timestamp: new Date() },
      ];

      await callback(events);

      expect(weatherService.getAffectedUsers).toHaveBeenCalledWith(23.02, 72.57);
      expect(notificationService.sendRainNotification).toHaveBeenCalledWith(mockUsers);
    });

    it('should not send notifications when no affected users found', async () => {
      jest.spyOn(weatherService, 'getAffectedUsers').mockResolvedValue([]);
      jest.spyOn(notificationService, 'sendRainNotification').mockResolvedValue([]);

      const onRainfallSpy = jest.spyOn(weatherService, 'onRainfall');
      setupWeatherNotificationIntegration(weatherService, notificationService);
      const callback = onRainfallSpy.mock.calls[0][0];

      const events: RainfallEvent[] = [
        { latitude: 23.02, longitude: 72.57, precipitationMm: 3.0, timestamp: new Date() },
      ];

      await callback(events);

      expect(weatherService.getAffectedUsers).toHaveBeenCalled();
      expect(notificationService.sendRainNotification).not.toHaveBeenCalled();
    });

    it('should handle multiple rainfall events', async () => {
      const mockUsers: AffectedUser[] = [
        { id: 'user-1', phoneNumber: '+919876543210', language: 'en' },
      ];

      jest.spyOn(weatherService, 'getAffectedUsers').mockResolvedValue(mockUsers);
      jest.spyOn(notificationService, 'sendRainNotification').mockResolvedValue([]);

      const onRainfallSpy = jest.spyOn(weatherService, 'onRainfall');
      setupWeatherNotificationIntegration(weatherService, notificationService);
      const callback = onRainfallSpy.mock.calls[0][0];

      const events: RainfallEvent[] = [
        { latitude: 23.02, longitude: 72.57, precipitationMm: 5.0, timestamp: new Date() },
        { latitude: 23.05, longitude: 72.60, precipitationMm: 2.0, timestamp: new Date() },
      ];

      await callback(events);

      expect(weatherService.getAffectedUsers).toHaveBeenCalledTimes(2);
      expect(notificationService.sendRainNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully without crashing', async () => {
      jest.spyOn(weatherService, 'getAffectedUsers').mockRejectedValue(new Error('DB down'));
      jest.spyOn(notificationService, 'sendRainNotification').mockResolvedValue([]);

      const onRainfallSpy = jest.spyOn(weatherService, 'onRainfall');
      setupWeatherNotificationIntegration(weatherService, notificationService);
      const callback = onRainfallSpy.mock.calls[0][0];

      const events: RainfallEvent[] = [
        { latitude: 23.02, longitude: 72.57, precipitationMm: 5.0, timestamp: new Date() },
      ];

      // Should not throw
      await expect(callback(events)).resolves.toBeUndefined();
      expect(notificationService.sendRainNotification).not.toHaveBeenCalled();
    });
  });
});

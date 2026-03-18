import {
  NotificationService,
  PushNotificationProvider,
  PushPayload,
  MockFCMProvider,
  withRetry,
  NotificationAction,
} from './notification.service';
import { AffectedUser } from './weather.service';

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const { query: mockedQuery } = jest.requireMock('../config/database') as { query: jest.Mock };

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    mockedQuery.mockReset();
    jest.restoreAllMocks();
  });

  // ---- Existing sendRainNotification tests ----

  describe('sendRainNotification', () => {
    const mockUsers: AffectedUser[] = [
      { id: 'user-1', phoneNumber: '+919876543210', language: 'en' },
      { id: 'user-2', phoneNumber: '+919876543211', language: 'hi' },
    ];

    it('should store a notification record for each user', async () => {
      mockedQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'notif-1', user_id: 'user-1', type: 'rain_detection', title: 'Rain Detected', body: 'Is there rain in your area?', sent_at: new Date(), responded_at: null, response: null }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'notif-2', user_id: 'user-2', type: 'rain_detection', title: 'Rain Detected', body: 'Is there rain in your area?', sent_at: new Date(), responded_at: null, response: null }],
        });

      const records = await service.sendRainNotification(mockUsers);

      expect(records).toHaveLength(2);
      expect(mockedQuery).toHaveBeenCalledTimes(2);
      expect(records[0].userId).toBe('user-1');
      expect(records[1].userId).toBe('user-2');
    });

    it('should insert with correct notification type and content', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 'notif-1', user_id: 'user-1', type: 'rain_detection', title: 'Rain Detected', body: 'Is there rain in your area?', sent_at: new Date(), responded_at: null, response: null }],
      });

      await service.sendRainNotification([mockUsers[0]]);

      const [sql, params] = mockedQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO notifications');
      expect(params[0]).toBe('user-1');
      expect(params[1]).toBe('rain_detection');
      expect(params[2]).toBe('Rain Detected');
      expect(params[3]).toBe('Is there rain in your area?');
    });

    it('should return empty array for empty user list', async () => {
      const records = await service.sendRainNotification([]);
      expect(records).toHaveLength(0);
      expect(mockedQuery).not.toHaveBeenCalled();
    });

    it('should return empty array for null/undefined input', async () => {
      const records = await service.sendRainNotification(null as any);
      expect(records).toHaveLength(0);
      expect(mockedQuery).not.toHaveBeenCalled();
    });

    it('should continue processing remaining users if one fails', async () => {
      mockedQuery
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({
          rows: [{ id: 'notif-2', user_id: 'user-2', type: 'rain_detection', title: 'Rain Detected', body: 'Is there rain in your area?', sent_at: new Date(), responded_at: null, response: null }],
        });

      const records = await service.sendRainNotification(mockUsers);

      expect(records).toHaveLength(1);
      expect(records[0].userId).toBe('user-2');
      expect(mockedQuery).toHaveBeenCalledTimes(2);
    });

    it('should attempt push delivery after storing DB record', async () => {
      const mockProvider: PushNotificationProvider = { send: jest.fn().mockResolvedValue(true) };
      const svc = new NotificationService(mockProvider);

      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 'notif-1', user_id: 'user-1', type: 'rain_detection', title: 'Rain Detected', body: 'Is there rain in your area?', sent_at: new Date(), responded_at: null, response: null }],
      });

      await svc.sendRainNotification([mockUsers[0]]);

      expect(mockProvider.send).toHaveBeenCalledTimes(1);
      const [token, payload] = (mockProvider.send as jest.Mock).mock.calls[0];
      expect(token).toBe('user-1');
      expect(payload.notification.title).toBe('Rain Detected');
      expect(payload.data.type).toBe('rain_detection');
      expect(payload.data.notification_id).toBe('notif-1');
    });
  });

  // ---- PushNotificationProvider / sendPushNotification tests ----

  describe('sendRainNotification - interactive payload', () => {
    const mockUser: AffectedUser = { id: 'user-1', phoneNumber: '+919876543210', language: 'en' };

    const dbRow = {
      id: 'notif-1',
      user_id: 'user-1',
      type: 'rain_detection',
      title: 'Rain Detected',
      body: 'Is there rain in your area?',
      sent_at: new Date(),
      responded_at: null,
      response: null,
    };

    it('should include Yes/No actions in the push payload data', async () => {
      const mockProvider: PushNotificationProvider = { send: jest.fn().mockResolvedValue(true) };
      const svc = new NotificationService(mockProvider);
      mockedQuery.mockResolvedValueOnce({ rows: [dbRow] });

      await svc.sendRainNotification([mockUser]);

      const [, payload] = (mockProvider.send as jest.Mock).mock.calls[0];
      const actions = JSON.parse(payload.data.actions);
      expect(actions).toEqual([
        { id: 'yes', title: 'Yes' },
        { id: 'no', title: 'No' },
      ]);
    });

    it('should store actions in the database data column', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [dbRow] });

      await service.sendRainNotification([mockUser]);

      const [, params] = mockedQuery.mock.calls[0];
      const data = JSON.parse(params[4]);
      expect(data.actions).toEqual([
        { id: 'yes', title: 'Yes' },
        { id: 'no', title: 'No' },
      ]);
    });

    it('should insert with responded_at and response as NULL', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [dbRow] });

      await service.sendRainNotification([mockUser]);

      const [sql] = mockedQuery.mock.calls[0];
      expect(sql).toContain('responded_at');
      expect(sql).toContain('response');
      expect(sql).toContain('NULL');
    });

    it('should return records with respondedAt and response as null', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [dbRow] });

      const records = await service.sendRainNotification([mockUser]);

      expect(records[0].respondedAt).toBeNull();
      expect(records[0].response).toBeNull();
    });

    it('should include notification_id and timestamp in push data', async () => {
      const mockProvider: PushNotificationProvider = { send: jest.fn().mockResolvedValue(true) };
      const svc = new NotificationService(mockProvider);
      mockedQuery.mockResolvedValueOnce({ rows: [dbRow] });

      await svc.sendRainNotification([mockUser]);

      const [, payload] = (mockProvider.send as jest.Mock).mock.calls[0];
      expect(payload.data.notification_id).toBe('notif-1');
      expect(payload.data.timestamp).toBeDefined();
      expect(payload.data.type).toBe('rain_detection');
    });

    it('should have "Is there rain in your area?" as the notification body', async () => {
      const mockProvider: PushNotificationProvider = { send: jest.fn().mockResolvedValue(true) };
      const svc = new NotificationService(mockProvider);
      mockedQuery.mockResolvedValueOnce({ rows: [dbRow] });

      await svc.sendRainNotification([mockUser]);

      const [, payload] = (mockProvider.send as jest.Mock).mock.calls[0];
      expect(payload.notification.title).toBe('Rain Detected');
      expect(payload.notification.body).toBe('Is there rain in your area?');
    });
  });

  // ---- sendInteractiveRainNotification tests ----

  describe('sendInteractiveRainNotification', () => {
    const mockUser: AffectedUser = { id: 'user-1', phoneNumber: '+919876543210', language: 'en' };

    it('should return a single notification record for one user', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 'notif-1', user_id: 'user-1', type: 'rain_detection', title: 'Rain Detected', body: 'Is there rain in your area?', sent_at: new Date(), responded_at: null, response: null }],
      });

      const record = await service.sendInteractiveRainNotification(mockUser);

      expect(record).not.toBeNull();
      expect(record!.userId).toBe('user-1');
      expect(record!.respondedAt).toBeNull();
      expect(record!.response).toBeNull();
    });

    it('should return null when DB insert fails', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('DB error'));

      const record = await service.sendInteractiveRainNotification(mockUser);

      expect(record).toBeNull();
    });
  });

  // ---- PushNotificationProvider / sendPushNotification tests ----

  describe('sendPushNotification', () => {
    const samplePayload: PushPayload = {
      notification: { title: 'Test', body: 'Hello' },
      data: {
        type: 'rain_detection',
        notification_id: 'n-1',
        timestamp: new Date().toISOString(),
      },
    };

    it('should return true when provider succeeds', async () => {
      const provider: PushNotificationProvider = { send: jest.fn().mockResolvedValue(true) };
      const svc = new NotificationService(provider);

      const result = await svc.sendPushNotification('token-abc', samplePayload);

      expect(result).toBe(true);
      expect(provider.send).toHaveBeenCalledWith('token-abc', samplePayload);
    });

    it('should return false when provider fails after retries', async () => {
      const provider: PushNotificationProvider = {
        send: jest.fn().mockRejectedValue(new Error('network error')),
      };
      const svc = new NotificationService(provider);

      const result = await svc.sendPushNotification('token-abc', samplePayload);

      expect(result).toBe(false);
      // 1 initial + 3 retries = 4 calls
      expect(provider.send).toHaveBeenCalledTimes(4);
    });

    it('should succeed on retry after transient failure', async () => {
      const provider: PushNotificationProvider = {
        send: jest.fn()
          .mockRejectedValueOnce(new Error('transient'))
          .mockResolvedValueOnce(true),
      };
      const svc = new NotificationService(provider);

      const result = await svc.sendPushNotification('token-abc', samplePayload);

      expect(result).toBe(true);
      expect(provider.send).toHaveBeenCalledTimes(2);
    });

    it('should not crash the caller when push fails', async () => {
      const provider: PushNotificationProvider = {
        send: jest.fn().mockRejectedValue(new Error('fatal')),
      };
      const svc = new NotificationService(provider);

      // Should resolve (not reject)
      await expect(svc.sendPushNotification('tok', samplePayload)).resolves.toBe(false);
    });
  });

  // ---- withRetry tests ----

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue(42);
      const result = await withRetry(fn, 3, 1);
      expect(result).toBe(42);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry up to maxRetries on failure', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(withRetry(fn, 2, 1)).rejects.toThrow('fail');
      // 1 initial + 2 retries = 3
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should succeed after transient failures', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('err'))
        .mockRejectedValueOnce(new Error('err'))
        .mockResolvedValueOnce('ok');

      const result = await withRetry(fn, 3, 1);
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  // ---- MockFCMProvider tests ----

  describe('MockFCMProvider', () => {
    it('should always resolve true', async () => {
      const provider = new MockFCMProvider();
      const payload: PushPayload = {
        notification: { title: 'T', body: 'B' },
        data: { type: 'rain_detection', notification_id: 'x', timestamp: '' },
      };
      await expect(provider.send('tok', payload)).resolves.toBe(true);
    });
  });
});

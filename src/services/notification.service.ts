import { query } from '../config/database';
import { AffectedUser } from './weather.service';

/**
 * Notification Service
 * Stores notification records and delivers push notifications via a pluggable provider.
 *
 * Requirements:
 *  1.2 - Rain notification with Yes/No question
 *  1.3 - Allow user to respond within notification interface
 *  8.2 - Proximity alert notifications
 *  8.3 - Alert includes severity and distance
 *  8.4 - Notify user of new reports on active route
 */

// --- Types ---

export type NotificationType = 'rain_detection' | 'navigation_alert' | 'route_update';

export interface PushPayload {
  notification: {
    title: string;
    body: string;
  };
  data: {
    type: NotificationType;
    notification_id: string;
    timestamp: string;
    [key: string]: string;
  };
}

export interface NotificationAction {
  id: string;
  title: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  sentAt: Date;
  respondedAt: Date | null;
  response: any | null;
}

// --- Provider interface ---

export interface PushNotificationProvider {
  send(deviceToken: string, payload: PushPayload): Promise<boolean>;
}

// --- Mock FCM provider (stub until real credentials are available) ---

export class MockFCMProvider implements PushNotificationProvider {
  async send(deviceToken: string, payload: PushPayload): Promise<boolean> {
    console.log(
      `[MockFCM] Would send to ${deviceToken}: ${payload.notification.title}`,
    );
    return true;
  }
}

// --- Retry helper ---

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  baseDelay: number = BASE_DELAY_MS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// --- Service ---

export class NotificationService {
  private pushProvider: PushNotificationProvider;

  constructor(provider?: PushNotificationProvider) {
    this.pushProvider = provider ?? new MockFCMProvider();
  }

  /**
   * Send a push notification to a single user with retry logic.
   * Logs failures but never throws – callers are not disrupted.
   */
  async sendPushNotification(
    deviceToken: string,
    payload: PushPayload,
  ): Promise<boolean> {
    try {
      const success = await withRetry(
        () => this.pushProvider.send(deviceToken, payload),
        DEFAULT_MAX_RETRIES,
        BASE_DELAY_MS,
      );
      return success;
    } catch (error) {
      console.error(
        `[NotificationService] Push failed after ${DEFAULT_MAX_RETRIES} retries:`,
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }

  /**
   * Send rain notifications to affected users with interactive Yes/No actions.
   * Stores a notification record per user in the database (with responded_at and response initially null),
   * then attempts push delivery with action buttons in the data payload.
   *
   * Requirements: 1.2, 1.3
   */
  async sendRainNotification(users: AffectedUser[]): Promise<NotificationRecord[]> {
    if (!users || users.length === 0) {
      return [];
    }

    const records: NotificationRecord[] = [];
    const actions: NotificationAction[] = [
      { id: 'yes', title: 'Yes' },
      { id: 'no', title: 'No' },
    ];

    for (const user of users) {
      try {
        const result = await query(
          `INSERT INTO notifications (user_id, type, title, body, data, sent_at, responded_at, response)
           VALUES ($1, $2, $3, $4, $5, NOW(), NULL, NULL)
           RETURNING id, user_id, type, title, body, sent_at, responded_at, response`,
          [
            user.id,
            'rain_detection',
            'Rain Detected',
            'Is there rain in your area?',
            JSON.stringify({ userId: user.id, language: user.language, actions }),
          ],
        );

        const row = result.rows[0];
        const record: NotificationRecord = {
          id: row.id,
          userId: row.user_id,
          type: row.type,
          title: row.title,
          body: row.body,
          sentAt: row.sent_at,
          respondedAt: row.responded_at ?? null,
          response: row.response ?? null,
        };
        records.push(record);

        // Build interactive push payload with action buttons
        const pushPayload: PushPayload = {
          notification: {
            title: 'Rain Detected',
            body: 'Is there rain in your area?',
          },
          data: {
            type: 'rain_detection',
            notification_id: record.id,
            timestamp: new Date().toISOString(),
            actions: JSON.stringify(actions),
          },
        };
        await this.sendPushNotification(user.id, pushPayload);

        console.log(`[NotificationService] Sent rain notification for user ${user.id}`);
      } catch (error) {
        console.error(
          `[NotificationService] Failed to store notification for user ${user.id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    console.log(`[NotificationService] Stored ${records.length}/${users.length} rain notifications`);
    return records;
  }

  /**
   * Send an interactive rain notification to a single user.
   * Convenience wrapper for sendRainNotification with a single user.
   *
   * Requirements: 1.2, 1.3
   */
  async sendInteractiveRainNotification(user: AffectedUser): Promise<NotificationRecord | null> {
    const records = await this.sendRainNotification([user]);
    return records.length > 0 ? records[0] : null;
  }
}

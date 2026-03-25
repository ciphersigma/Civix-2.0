import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const WEATHER_API = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
const RAIN_CODES = new Set([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99]);

// Grid points across Ahmedabad for better coverage
const CHECK_POINTS = [
  { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad Center' },
  { lat: 23.07, lng: 72.53, name: 'Ahmedabad West' },
  { lat: 23.07, lng: 72.62, name: 'Ahmedabad East' },
  { lat: 22.97, lng: 72.55, name: 'Ahmedabad South' },
  { lat: 23.10, lng: 72.57, name: 'Ahmedabad North' },
];

/**
 * Vercel Cron: Check weather and send rain notifications
 * Runs daily (Hobby plan). Checks Open-Meteo for rain at multiple points.
 * If rain detected, finds users within 5km and sends FCM push notifications.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  try {
    let totalNotified = 0;
    const rainPoints: any[] = [];

    // Check weather at each grid point
    for (const point of CHECK_POINTS) {
      try {
        const weatherRes = await fetch(
          `${WEATHER_API}?latitude=${point.lat}&longitude=${point.lng}&current=precipitation,rain,weather_code&timezone=Asia/Kolkata`
        );
        const data = await weatherRes.json();
        const current = data.current || {};
        const precip = Math.max(current.precipitation || 0, current.rain || 0);
        const isRaining = precip > 0.1 || RAIN_CODES.has(current.weather_code);

        if (isRaining) {
          rainPoints.push({ ...point, precipitation: precip, weatherCode: current.weather_code });
        }
      } catch (e) {
        console.error(`[WeatherCron] Failed to check ${point.name}:`, e);
      }
    }

    if (rainPoints.length === 0) {
      await pool.end();
      return res.status(200).json({ success: true, message: 'No rain detected', rainPoints: 0, notified: 0 });
    }

    console.log(`[WeatherCron] Rain detected at ${rainPoints.length} point(s)`);

    // For each rain point, find nearby users and notify
    for (const rp of rainPoints) {
      // Rate limit: don't notify users who got a rain alert in the last 2 hours
      const usersResult = await pool.query(
        `SELECT u.id, u.fcm_token, u.language
         FROM users u
         WHERE u.weather_alerts_enabled = TRUE
           AND u.fcm_token IS NOT NULL
           AND u.last_known_location IS NOT NULL
           AND ST_DWithin(
             u.last_known_location,
             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
             5000
           )
           AND NOT EXISTS (
             SELECT 1 FROM notifications n
             WHERE n.user_id = u.id AND n.type = 'rain_detection'
               AND n.sent_at > NOW() - INTERVAL '2 hours'
           )`,
        [rp.lng, rp.lat]
      );

      const users = usersResult.rows;
      if (users.length === 0) continue;

      // Log the weather alert event
      await pool.query(
        `INSERT INTO weather_alerts (latitude, longitude, precipitation_mm, weather_code, description, users_notified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [rp.lat, rp.lng, rp.precipitation, rp.weatherCode, `Rain at ${rp.name}`, users.length]
      );

      // Send notifications to each user
      for (const user of users) {
        try {
          // Store notification in DB
          const notifResult = await pool.query(
            `INSERT INTO notifications (user_id, type, title, body, data, sent_at)
             VALUES ($1, 'rain_detection', 'Rain Alert 🌧️', 'Rain detected in your area. Stay safe and watch for waterlogging!',
                     $2, NOW())
             RETURNING id`,
            [user.id, JSON.stringify({ latitude: rp.lat, longitude: rp.lng, precipitation: rp.precipitation })]
          );

          // Send FCM push notification
          if (user.fcm_token) {
            await sendFCMNotification(user.fcm_token, {
              title: 'Rain Alert 🌧️',
              body: 'Rain detected in your area. Stay safe and watch for waterlogging!',
              data: {
                type: 'rain_detection',
                notification_id: notifResult.rows[0].id,
                latitude: String(rp.lat),
                longitude: String(rp.lng),
                precipitation: String(rp.precipitation),
              },
            });
          }

          totalNotified++;
        } catch (e) {
          console.error(`[WeatherCron] Failed to notify user ${user.id}:`, e);
        }
      }
    }

    await pool.end();
    return res.status(200).json({
      success: true,
      rainPoints: rainPoints.length,
      notified: totalNotified,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[WeatherCron] Error:', error);
    await pool.end();
    return res.status(500).json({ error: 'Weather check failed' });
  }
}

/**
 * Send FCM push notification via Firebase HTTP v1 API
 * Uses service account for auth (falls back to legacy API with server key)
 */
async function sendFCMNotification(
  token: string,
  payload: { title: string; body: string; data?: Record<string, string> }
) {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey || serverKey === 'your-firebase-server-key-here') {
    console.log(`[FCM Mock] Would send to ${token.substring(0, 20)}...: ${payload.title}`);
    return;
  }

  // Use legacy FCM HTTP API (simpler, works with server key)
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${serverKey}`,
    },
    body: JSON.stringify({
      to: token,
      notification: { title: payload.title, body: payload.body, sound: 'default' },
      data: payload.data || {},
      priority: 'high',
    }),
  });

  if (!res.ok) {
    console.error(`[FCM] Send failed: ${res.status} ${await res.text()}`);
  }
}

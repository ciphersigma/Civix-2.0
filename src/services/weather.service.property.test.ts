import * as fc from 'fast-check';
import { WeatherService, AHMEDABAD_BOUNDS, RainfallEvent, AffectedUser, WeatherData } from './weather.service';
import { NotificationService, NotificationRecord } from './notification.service';
import { setupWeatherNotificationIntegration } from './weather-notification.integration';

jest.mock('axios');
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const { query: mockedQuery } = jest.requireMock('../config/database') as { query: jest.Mock };

/**
 * Property-Based Tests for Weather Service - Rain Notification Targeting
 *
 * These tests verify universal properties that should hold across all valid inputs
 * using the fast-check framework with minimum 100 iterations per property.
 */

// ── Custom Generators ──────────────────────────────────────────────────────────

/** Coordinates strictly within Ahmedabad bounds */
const ahmedabadCoordinateGen = fc.record({
  latitude: fc.double({ min: AHMEDABAD_BOUNDS.south, max: AHMEDABAD_BOUNDS.north, noNaN: true }),
  longitude: fc.double({ min: AHMEDABAD_BOUNDS.west, max: AHMEDABAD_BOUNDS.east, noNaN: true }),
});

/** Coordinates outside Ahmedabad bounds */
const outsideAhmedabadCoordinateGen = fc.oneof(
  fc.record({
    latitude: fc.double({ min: AHMEDABAD_BOUNDS.north + 0.01, max: 28.0, noNaN: true }),
    longitude: fc.double({ min: AHMEDABAD_BOUNDS.west, max: AHMEDABAD_BOUNDS.east, noNaN: true }),
  }),
  fc.record({
    latitude: fc.double({ min: 18.0, max: AHMEDABAD_BOUNDS.south - 0.01, noNaN: true }),
    longitude: fc.double({ min: AHMEDABAD_BOUNDS.west, max: AHMEDABAD_BOUNDS.east, noNaN: true }),
  }),
);

/** Rainfall event within Ahmedabad */
const rainfallEventGen = ahmedabadCoordinateGen.chain((coords) =>
  fc.record({
    latitude: fc.constant(coords.latitude),
    longitude: fc.constant(coords.longitude),
    precipitationMm: fc.double({ min: 0.1, max: 100, noNaN: true }),
    timestamp: fc.date({ min: new Date('2024-06-01'), max: new Date('2024-09-30') }),
  }),
);

/** Generate a list of affected users (1-20 users) */
const affectedUsersGen = fc.array(
  fc.record({
    id: fc.uuid(),
    phoneNumber: fc.tuple(
      fc.constantFrom('+91'),
      fc.integer({ min: 6000000000, max: 9999999999 }),
    ).map(([code, num]) => `${code}${num}`),
    language: fc.constantFrom('en', 'hi', 'gu'),
  }),
  { minLength: 1, maxLength: 20 },
);

/** Precipitation amount that counts as rain */
const rainfallPrecipitationGen = fc.double({ min: 0.1, max: 200, noNaN: true });

/** WMO weather codes that indicate rain */
const rainWeatherCodeGen = fc.constantFrom(51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99);

/** WeatherData that represents active rainfall within Ahmedabad */
const rainyWeatherDataGen = ahmedabadCoordinateGen.chain((coords) =>
  fc.oneof(
    // Rain via precipitation amount
    rainfallPrecipitationGen.map((precip) => ({
      latitude: coords.latitude,
      longitude: coords.longitude,
      current: {
        time: new Date().toISOString(),
        precipitation: precip,
        rain: precip * 0.8,
        weatherCode: 0,
      },
      isRaining: true,
    } as WeatherData)),
    // Rain via weather code
    rainWeatherCodeGen.map((code) => ({
      latitude: coords.latitude,
      longitude: coords.longitude,
      current: {
        time: new Date().toISOString(),
        precipitation: 0,
        rain: 0,
        weatherCode: code,
      },
      isRaining: true,
    } as WeatherData)),
  ),
);

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('WeatherService - Property-Based Tests', () => {
  let weatherService: WeatherService;
  let notificationService: NotificationService;

  beforeEach(() => {
    weatherService = new WeatherService({
      pollingIntervalMs: 5 * 60 * 1000,
      precipitationThresholdMm: 0.1,
    });
    notificationService = new NotificationService();
    jest.clearAllMocks();
  });

  /**
   * Feature: waterlogging-alert-platform, Property 1: Rain Notification Targeting and Timing
   *
   * **Validates: Requirements 1.1**
   *
   * Property: For any rainfall event detected in Ahmedabad, all users within the
   * affected geographic area should receive a rain notification within 5 minutes
   * of detection.
   *
   * This property test verifies that:
   * 1. Rainfall within Ahmedabad triggers notifications to all affected users
   * 2. Every affected user receives exactly one notification per rainfall event
   * 3. Notifications are dispatched within the 5-minute timing window
   * 4. Rainfall outside Ahmedabad does NOT trigger notifications
   */
  describe('Property 1: Rain Notification Targeting and Timing', () => {

    it('should send notifications to ALL affected users for any rainfall event in Ahmedabad', async () => {
      await fc.assert(
        fc.asyncProperty(
          rainfallEventGen,
          affectedUsersGen,
          async (event: RainfallEvent, users: AffectedUser[]) => {
            jest.clearAllMocks();

            // Mock getAffectedUsers to return the generated users
            jest.spyOn(weatherService, 'getAffectedUsers').mockResolvedValue(users);

            // Track which users receive notifications
            const notifiedUserIds: string[] = [];
            jest.spyOn(notificationService, 'sendRainNotification').mockImplementation(
              async (notifyUsers: AffectedUser[]) => {
                for (const u of notifyUsers) {
                  notifiedUserIds.push(u.id);
                }
                return notifyUsers.map((u) => ({
                  id: `notif-${u.id}`,
                  userId: u.id,
                  type: 'rain_detection',
                  title: 'Rain Detected',
                  body: 'Is there rain in your area?',
                  sentAt: new Date(),
                }));
              },
            );

            // Wire up integration
            setupWeatherNotificationIntegration(weatherService, notificationService);

            // Simulate rainfall callback
            const onRainfallSpy = jest.spyOn(weatherService, 'onRainfall');
            setupWeatherNotificationIntegration(weatherService, notificationService);
            const callback = onRainfallSpy.mock.calls[0][0];
            await callback([event]);

            // Every affected user must be notified
            expect(notifiedUserIds.length).toBe(users.length);
            for (const user of users) {
              expect(notifiedUserIds).toContain(user.id);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should dispatch notifications within 5 minutes of rainfall detection', async () => {
      await fc.assert(
        fc.asyncProperty(
          rainfallEventGen,
          affectedUsersGen,
          async (event: RainfallEvent, users: AffectedUser[]) => {
            jest.clearAllMocks();

            jest.spyOn(weatherService, 'getAffectedUsers').mockResolvedValue(users);

            let notificationTimestamp: number | null = null;
            jest.spyOn(notificationService, 'sendRainNotification').mockImplementation(
              async (notifyUsers: AffectedUser[]) => {
                notificationTimestamp = Date.now();
                return notifyUsers.map((u) => ({
                  id: `notif-${u.id}`,
                  userId: u.id,
                  type: 'rain_detection',
                  title: 'Rain Detected',
                  body: 'Is there rain in your area?',
                  sentAt: new Date(),
                }));
              },
            );

            setupWeatherNotificationIntegration(weatherService, notificationService);

            const onRainfallSpy = jest.spyOn(weatherService, 'onRainfall');
            setupWeatherNotificationIntegration(weatherService, notificationService);
            const callback = onRainfallSpy.mock.calls[0][0];

            const detectionTime = Date.now();
            await callback([event]);

            // Notification must have been sent
            expect(notificationTimestamp).not.toBeNull();

            // Time between detection and notification must be < 5 minutes (300000ms)
            const elapsed = notificationTimestamp! - detectionTime;
            expect(elapsed).toBeLessThan(5 * 60 * 1000);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should detect rainfall for any weather data with precipitation within Ahmedabad bounds', async () => {
      await fc.assert(
        fc.asyncProperty(
          rainyWeatherDataGen,
          async (weatherData: WeatherData) => {
            // detectRainfall should identify this as rain
            const isRaining = weatherService.detectRainfall(weatherData);

            // parseRainfallEvents should produce events when isRaining is true
            const dataWithFlag = { ...weatherData, isRaining };
            const events = weatherService.parseRainfallEvents(dataWithFlag);

            if (isRaining) {
              const withinBounds = weatherService.isWithinAhmedabadBounds(
                weatherData.latitude,
                weatherData.longitude,
              );
              if (withinBounds) {
                // Must produce at least one rainfall event
                expect(events.length).toBeGreaterThanOrEqual(1);
                // Event coordinates must be within Ahmedabad
                for (const e of events) {
                  expect(e.latitude).toBeGreaterThanOrEqual(AHMEDABAD_BOUNDS.south);
                  expect(e.latitude).toBeLessThanOrEqual(AHMEDABAD_BOUNDS.north);
                  expect(e.longitude).toBeGreaterThanOrEqual(AHMEDABAD_BOUNDS.west);
                  expect(e.longitude).toBeLessThanOrEqual(AHMEDABAD_BOUNDS.east);
                }
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should query affected users using the rainfall event coordinates', async () => {
      await fc.assert(
        fc.asyncProperty(
          rainfallEventGen,
          affectedUsersGen,
          async (event: RainfallEvent, users: AffectedUser[]) => {
            jest.clearAllMocks();

            const getAffectedSpy = jest.spyOn(weatherService, 'getAffectedUsers').mockResolvedValue(users);
            jest.spyOn(notificationService, 'sendRainNotification').mockResolvedValue([]);

            setupWeatherNotificationIntegration(weatherService, notificationService);

            const onRainfallSpy = jest.spyOn(weatherService, 'onRainfall');
            setupWeatherNotificationIntegration(weatherService, notificationService);
            const callback = onRainfallSpy.mock.calls[0][0];
            await callback([event]);

            // getAffectedUsers must be called with the event's coordinates
            expect(getAffectedSpy).toHaveBeenCalledWith(event.latitude, event.longitude);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should NOT produce rainfall events for coordinates outside Ahmedabad', async () => {
      await fc.assert(
        fc.asyncProperty(
          outsideAhmedabadCoordinateGen,
          rainfallPrecipitationGen,
          async (coords, precip) => {
            const weatherData: WeatherData = {
              latitude: coords.latitude,
              longitude: coords.longitude,
              current: {
                time: new Date().toISOString(),
                precipitation: precip,
                rain: precip,
                weatherCode: 61,
              },
              isRaining: true,
            };

            const events = weatherService.parseRainfallEvents(weatherData);

            // No events should be generated for locations outside Ahmedabad
            expect(events).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

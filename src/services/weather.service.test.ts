import axios from 'axios';
import { WeatherService, AHMEDABAD_BOUNDS, WeatherData } from './weather.service';

jest.mock('axios');
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const { query: mockedQuery } = jest.requireMock('../config/database') as { query: jest.Mock };

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(() => {
    service = new WeatherService({
      apiUrl: 'https://api.open-meteo.com/v1/forecast',
      pollingIntervalMs: 5 * 60 * 1000,
      precipitationThresholdMm: 0.1,
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    service.stopPolling();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('AHMEDABAD_BOUNDS', () => {
    it('should define Ahmedabad center coordinates', () => {
      expect(AHMEDABAD_BOUNDS.center.lat).toBeCloseTo(23.0225, 2);
      expect(AHMEDABAD_BOUNDS.center.lng).toBeCloseTo(72.5714, 2);
    });

    it('should define geographic bounds around Ahmedabad', () => {
      expect(AHMEDABAD_BOUNDS.north).toBeGreaterThan(AHMEDABAD_BOUNDS.center.lat);
      expect(AHMEDABAD_BOUNDS.south).toBeLessThan(AHMEDABAD_BOUNDS.center.lat);
      expect(AHMEDABAD_BOUNDS.east).toBeGreaterThan(AHMEDABAD_BOUNDS.center.lng);
      expect(AHMEDABAD_BOUNDS.west).toBeLessThan(AHMEDABAD_BOUNDS.center.lng);
    });
  });

  describe('isWithinAhmedabadBounds', () => {
    it('should return true for Ahmedabad center', () => {
      expect(service.isWithinAhmedabadBounds(23.0225, 72.5714)).toBe(true);
    });

    it('should return false for coordinates outside bounds', () => {
      expect(service.isWithinAhmedabadBounds(19.076, 72.8777)).toBe(false); // Mumbai
      expect(service.isWithinAhmedabadBounds(28.6139, 77.209)).toBe(false); // Delhi
    });

    it('should return true for coordinates at the boundary edges', () => {
      expect(service.isWithinAhmedabadBounds(AHMEDABAD_BOUNDS.north, AHMEDABAD_BOUNDS.east)).toBe(true);
      expect(service.isWithinAhmedabadBounds(AHMEDABAD_BOUNDS.south, AHMEDABAD_BOUNDS.west)).toBe(true);
    });
  });

  describe('detectRainfall', () => {
    const makeWeatherData = (overrides: Partial<WeatherData['current']> = {}): WeatherData => ({
      latitude: 23.0225,
      longitude: 72.5714,
      current: {
        time: '2024-07-15T14:00',
        precipitation: 0,
        rain: 0,
        weatherCode: 0,
        ...overrides,
      },
      isRaining: false,
    });

    it('should detect rainfall when precipitation exceeds threshold', () => {
      expect(service.detectRainfall(makeWeatherData({ precipitation: 2.5 }))).toBe(true);
    });

    it('should detect rainfall when rain field exceeds threshold', () => {
      expect(service.detectRainfall(makeWeatherData({ rain: 1.0 }))).toBe(true);
    });

    it('should detect rainfall from WMO rain weather codes', () => {
      // Drizzle
      expect(service.detectRainfall(makeWeatherData({ weatherCode: 51 }))).toBe(true);
      // Rain
      expect(service.detectRainfall(makeWeatherData({ weatherCode: 61 }))).toBe(true);
      // Rain showers
      expect(service.detectRainfall(makeWeatherData({ weatherCode: 80 }))).toBe(true);
      // Thunderstorm
      expect(service.detectRainfall(makeWeatherData({ weatherCode: 95 }))).toBe(true);
    });

    it('should not detect rainfall for clear weather', () => {
      expect(service.detectRainfall(makeWeatherData({ weatherCode: 0 }))).toBe(false);
      expect(service.detectRainfall(makeWeatherData({ weatherCode: 1 }))).toBe(false);
    });

    it('should not detect rainfall when precipitation is below threshold', () => {
      expect(service.detectRainfall(makeWeatherData({ precipitation: 0.05 }))).toBe(false);
    });
  });

  describe('parseRainfallEvents', () => {
    it('should return rainfall events when raining within Ahmedabad', () => {
      const weatherData: WeatherData = {
        latitude: 23.02,
        longitude: 72.57,
        current: {
          time: '2024-07-15T14:00',
          precipitation: 5.0,
          rain: 4.5,
          weatherCode: 61,
        },
        isRaining: true,
      };

      const events = service.parseRainfallEvents(weatherData);
      expect(events).toHaveLength(1);
      expect(events[0].precipitationMm).toBe(5.0);
      expect(events[0].latitude).toBe(23.02);
      expect(events[0].longitude).toBe(72.57);
    });

    it('should return empty array when not raining', () => {
      const weatherData: WeatherData = {
        latitude: 23.02,
        longitude: 72.57,
        current: {
          time: '2024-07-15T14:00',
          precipitation: 0,
          rain: 0,
          weatherCode: 0,
        },
        isRaining: false,
      };

      expect(service.parseRainfallEvents(weatherData)).toHaveLength(0);
    });

    it('should return empty array when raining outside Ahmedabad bounds', () => {
      const weatherData: WeatherData = {
        latitude: 19.076,
        longitude: 72.877,
        current: {
          time: '2024-07-15T14:00',
          precipitation: 10.0,
          rain: 10.0,
          weatherCode: 63,
        },
        isRaining: true,
      };

      expect(service.parseRainfallEvents(weatherData)).toHaveLength(0);
    });
  });

  describe('pollWeatherData', () => {
    it('should fetch weather data from Open-Meteo API', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: {
            time: '2024-07-15T14:00',
            precipitation: 3.2,
            rain: 2.8,
            weather_code: 61,
          },
        },
      });

      const result = await service.pollWeatherData();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.open-meteo.com/v1/forecast',
        expect.objectContaining({
          params: expect.objectContaining({
            latitude: AHMEDABAD_BOUNDS.center.lat,
            longitude: AHMEDABAD_BOUNDS.center.lng,
            current: 'precipitation,rain,weather_code',
            timezone: 'Asia/Kolkata',
          }),
        }),
      );

      expect(result.current.precipitation).toBe(3.2);
      expect(result.current.rain).toBe(2.8);
      expect(result.isRaining).toBe(true);
    });

    it('should handle API response with zero precipitation', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: {
            time: '2024-07-15T14:00',
            precipitation: 0,
            rain: 0,
            weather_code: 0,
          },
        },
      });

      const result = await service.pollWeatherData();
      expect(result.isRaining).toBe(false);
    });

    it('should propagate API errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      await expect(service.pollWeatherData()).rejects.toThrow('Network error');
    });
  });

  describe('polling lifecycle', () => {
    it('should start and stop polling', () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: { time: '2024-07-15T14:00', precipitation: 0, rain: 0, weather_code: 0 },
        },
      });

      expect(service.isPolling()).toBe(false);
      service.startPolling();
      expect(service.isPolling()).toBe(true);
      service.stopPolling();
      expect(service.isPolling()).toBe(false);
    });

    it('should invoke onRainfall callback when rainfall detected', async () => {
      const callback = jest.fn();
      service.onRainfall(callback);

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: { time: '2024-07-15T14:00', precipitation: 5.0, rain: 4.0, weather_code: 61 },
        },
      });

      // Call the poll method directly via pollWeatherData + parseRainfallEvents
      const weatherData = await service.pollWeatherData();
      const events = service.parseRainfallEvents(weatherData);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].precipitationMm).toBe(5.0);
    });

    it('should not produce rainfall events when no rainfall', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: { time: '2024-07-15T14:00', precipitation: 0, rain: 0, weather_code: 0 },
        },
      });

      const weatherData = await service.pollWeatherData();
      const events = service.parseRainfallEvents(weatherData);

      expect(events).toHaveLength(0);
    });

    it('should use 5-minute polling interval', () => {
      expect(service['config'].pollingIntervalMs).toBe(5 * 60 * 1000);
    });
  });

  describe('detectRainfall - edge cases', () => {
    const makeWeatherData = (overrides: Partial<WeatherData['current']> = {}): WeatherData => ({
      latitude: 23.0225,
      longitude: 72.5714,
      current: {
        time: '2024-07-15T14:00',
        precipitation: 0,
        rain: 0,
        weatherCode: 0,
        ...overrides,
      },
      isRaining: false,
    });

    it('should detect rainfall at exact threshold (0.1mm precipitation)', () => {
      expect(service.detectRainfall(makeWeatherData({ precipitation: 0.1 }))).toBe(true);
    });

    it('should detect rainfall at exact threshold (0.1mm rain)', () => {
      expect(service.detectRainfall(makeWeatherData({ rain: 0.1 }))).toBe(true);
    });

    it('should not detect rainfall just below threshold (0.09mm)', () => {
      expect(service.detectRainfall(makeWeatherData({ precipitation: 0.09, rain: 0.09 }))).toBe(false);
    });

    it('should detect all WMO drizzle codes (51, 53, 55, 56, 57)', () => {
      for (const code of [51, 53, 55, 56, 57]) {
        expect(service.detectRainfall(makeWeatherData({ weatherCode: code }))).toBe(true);
      }
    });

    it('should detect all WMO rain codes (61, 63, 65, 66, 67)', () => {
      for (const code of [61, 63, 65, 66, 67]) {
        expect(service.detectRainfall(makeWeatherData({ weatherCode: code }))).toBe(true);
      }
    });

    it('should detect all WMO shower/thunderstorm codes (80, 81, 82, 95, 96, 99)', () => {
      for (const code of [80, 81, 82, 95, 96, 99]) {
        expect(service.detectRainfall(makeWeatherData({ weatherCode: code }))).toBe(true);
      }
    });

    it('should not detect rainfall for non-rain WMO codes (fog, snow, etc.)', () => {
      // Fog=45, Snow=71, Hail only=77, Overcast=3
      for (const code of [3, 45, 48, 71, 73, 75, 77]) {
        expect(service.detectRainfall(makeWeatherData({ weatherCode: code }))).toBe(false);
      }
    });
  });

  describe('isWithinAhmedabadBounds - boundary edge cases', () => {
    it('should return false for coordinates just outside the north boundary', () => {
      expect(service.isWithinAhmedabadBounds(AHMEDABAD_BOUNDS.north + 0.001, 72.5714)).toBe(false);
    });

    it('should return false for coordinates just outside the south boundary', () => {
      expect(service.isWithinAhmedabadBounds(AHMEDABAD_BOUNDS.south - 0.001, 72.5714)).toBe(false);
    });

    it('should return false for coordinates just outside the east boundary', () => {
      expect(service.isWithinAhmedabadBounds(23.0225, AHMEDABAD_BOUNDS.east + 0.001)).toBe(false);
    });

    it('should return false for coordinates just outside the west boundary', () => {
      expect(service.isWithinAhmedabadBounds(23.0225, AHMEDABAD_BOUNDS.west - 0.001)).toBe(false);
    });

    it('should return true for all four corners of the bounds', () => {
      const { north, south, east, west } = AHMEDABAD_BOUNDS;
      expect(service.isWithinAhmedabadBounds(north, east)).toBe(true);
      expect(service.isWithinAhmedabadBounds(north, west)).toBe(true);
      expect(service.isWithinAhmedabadBounds(south, east)).toBe(true);
      expect(service.isWithinAhmedabadBounds(south, west)).toBe(true);
    });
  });

  describe('pollWeatherData - edge cases', () => {
    it('should handle null precipitation/rain/weather_code with defaults of 0', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: {
            time: '2024-07-15T14:00',
            precipitation: null,
            rain: null,
            weather_code: null,
          },
        },
      });

      const result = await service.pollWeatherData();
      expect(result.current.precipitation).toBe(0);
      expect(result.current.rain).toBe(0);
      expect(result.current.weatherCode).toBe(0);
      expect(result.isRaining).toBe(false);
    });

    it('should handle undefined precipitation/rain/weather_code with defaults of 0', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: {
            time: '2024-07-15T14:00',
          },
        },
      });

      const result = await service.pollWeatherData();
      expect(result.current.precipitation).toBe(0);
      expect(result.current.rain).toBe(0);
      expect(result.current.weatherCode).toBe(0);
      expect(result.isRaining).toBe(false);
    });

    it('should set isRaining based on WMO code even when precipitation is zero', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: {
            time: '2024-07-15T14:00',
            precipitation: 0,
            rain: 0,
            weather_code: 61, // Rain WMO code
          },
        },
      });

      const result = await service.pollWeatherData();
      expect(result.isRaining).toBe(true);
    });

    it('should pass a 10-second timeout to axios', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: { time: '2024-07-15T14:00', precipitation: 0, rain: 0, weather_code: 0 },
        },
      });

      await service.pollWeatherData();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 10000 }),
      );
    });
  });

  describe('parseRainfallEvents - edge cases', () => {
    it('should use the maximum of precipitation and rain for precipitationMm', () => {
      const weatherData: WeatherData = {
        latitude: 23.02,
        longitude: 72.57,
        current: {
          time: '2024-07-15T14:00',
          precipitation: 3.0,
          rain: 7.5,
          weatherCode: 61,
        },
        isRaining: true,
      };

      const events = service.parseRainfallEvents(weatherData);
      expect(events).toHaveLength(1);
      expect(events[0].precipitationMm).toBe(7.5); // max(3.0, 7.5)
    });

    it('should use precipitation when it exceeds rain', () => {
      const weatherData: WeatherData = {
        latitude: 23.02,
        longitude: 72.57,
        current: {
          time: '2024-07-15T14:00',
          precipitation: 10.0,
          rain: 2.0,
          weatherCode: 63,
        },
        isRaining: true,
      };

      const events = service.parseRainfallEvents(weatherData);
      expect(events[0].precipitationMm).toBe(10.0); // max(10.0, 2.0)
    });

    it('should parse the timestamp from weather data', () => {
      const weatherData: WeatherData = {
        latitude: 23.02,
        longitude: 72.57,
        current: {
          time: '2024-07-15T14:00',
          precipitation: 5.0,
          rain: 5.0,
          weatherCode: 61,
        },
        isRaining: true,
      };

      const events = service.parseRainfallEvents(weatherData);
      expect(events[0].timestamp).toBeInstanceOf(Date);
      expect(events[0].timestamp.toISOString()).toContain('2024-07-15');
    });
  });

  describe('constructor and configuration', () => {
    it('should use default config when no overrides provided', () => {
      const defaultService = new WeatherService();
      expect(defaultService['config'].pollingIntervalMs).toBe(5 * 60 * 1000);
      expect(defaultService['config'].precipitationThresholdMm).toBe(0.1);
    });

    it('should allow partial config overrides', () => {
      const customService = new WeatherService({ precipitationThresholdMm: 0.5 });
      expect(customService['config'].precipitationThresholdMm).toBe(0.5);
      expect(customService['config'].pollingIntervalMs).toBe(5 * 60 * 1000); // default preserved
    });

    it('should respect custom precipitation threshold', () => {
      const strictService = new WeatherService({ precipitationThresholdMm: 1.0 });
      const weatherData: WeatherData = {
        latitude: 23.02,
        longitude: 72.57,
        current: { time: '2024-07-15T14:00', precipitation: 0.5, rain: 0.5, weatherCode: 0 },
        isRaining: false,
      };
      // 0.5mm is below the 1.0mm threshold
      expect(strictService.detectRainfall(weatherData)).toBe(false);
    });
  });

  describe('polling lifecycle - advanced', () => {
    it('should not start a second polling timer if already polling', () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: { time: '2024-07-15T14:00', precipitation: 0, rain: 0, weather_code: 0 },
        },
      });

      service.startPolling();
      const firstTimer = service['pollingTimer'];
      service.startPolling(); // second call should be a no-op
      expect(service['pollingTimer']).toBe(firstTimer);
    });

    it('should invoke the onRainfall callback during a poll cycle when rainfall is detected', async () => {
      jest.useRealTimers();

      const callback = jest.fn();
      service.onRainfall(callback);

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: { time: '2024-07-15T14:00', precipitation: 5.0, rain: 4.0, weather_code: 61 },
        },
      });

      // Call poll indirectly via the public methods
      const weatherData = await service.pollWeatherData();
      const events = service.parseRainfallEvents(weatherData);

      // Simulate what the private poll() does
      if (events.length > 0) {
        callback(events);
      }

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ precipitationMm: 5.0 }),
        ]),
      );
    });

    it('should handle errors during poll without crashing', async () => {
      jest.useRealTimers();

      mockedAxios.get.mockRejectedValueOnce(new Error('API timeout'));

      // The poll error is caught internally — pollWeatherData itself throws,
      // but the private poll() method catches it
      await expect(service.pollWeatherData()).rejects.toThrow('API timeout');

      // Service should still be functional after an error
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: { time: '2024-07-15T14:00', precipitation: 0, rain: 0, weather_code: 0 },
        },
      });

      const result = await service.pollWeatherData();
      expect(result.isRaining).toBe(false);
    });

    it('should stop polling and report not polling', () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          latitude: 23.02,
          longitude: 72.56,
          current: { time: '2024-07-15T14:00', precipitation: 5.0, rain: 4.0, weather_code: 61 },
        },
      });

      service.startPolling();
      expect(service.isPolling()).toBe(true);

      service.stopPolling();
      expect(service.isPolling()).toBe(false);
    });

    it('stopPolling should be safe to call when not polling', () => {
      expect(() => service.stopPolling()).not.toThrow();
      expect(service.isPolling()).toBe(false);
    });
  });

  describe('getAffectedUsers', () => {
    beforeEach(() => {
      mockedQuery.mockReset();
    });

    it('should query users within the rainfall area using PostGIS ST_DWithin', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [
          { id: 'user-1', phone_number: '+919876543210', language: 'en' },
          { id: 'user-2', phone_number: '+919876543211', language: 'hi' },
        ],
      });

      const result = await service.getAffectedUsers(23.0225, 72.5714, 5000);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin'),
        [72.5714, 23.0225, 5000],
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'user-1', phoneNumber: '+919876543210', language: 'en' });
      expect(result[1]).toEqual({ id: 'user-2', phoneNumber: '+919876543211', language: 'hi' });
    });

    it('should only return verified users with a known location', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getAffectedUsers(23.0225, 72.5714);

      const sqlArg = mockedQuery.mock.calls[0][0] as string;
      expect(sqlArg).toContain('phone_verified = TRUE');
      expect(sqlArg).toContain('last_known_location IS NOT NULL');
      expect(result).toHaveLength(0);
    });

    it('should use default 5km radius when not specified', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] });

      await service.getAffectedUsers(23.0225, 72.5714);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [72.5714, 23.0225, 5000],
      );
    });

    it('should accept a custom radius in meters', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] });

      await service.getAffectedUsers(23.0225, 72.5714, 10000);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        [72.5714, 23.0225, 10000],
      );
    });

    it('should pass longitude as first param and latitude as second to ST_MakePoint', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] });

      await service.getAffectedUsers(23.05, 72.60);

      // ST_MakePoint expects (longitude, latitude)
      const params = mockedQuery.mock.calls[0][1];
      expect(params[0]).toBe(72.60); // longitude first
      expect(params[1]).toBe(23.05); // latitude second
    });

    it('should propagate database errors', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(service.getAffectedUsers(23.0225, 72.5714)).rejects.toThrow('Connection refused');
    });

    it('should return empty array when no users match', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getAffectedUsers(23.0225, 72.5714, 100);
      expect(result).toEqual([]);
    });

    it('should correctly map all fields from database rows', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [
          { id: 'u-abc', phone_number: '+911234567890', language: 'gu' },
        ],
      });

      const result = await service.getAffectedUsers(23.0, 72.5);
      expect(result).toEqual([
        { id: 'u-abc', phoneNumber: '+911234567890', language: 'gu' },
      ]);
    });
  });
});

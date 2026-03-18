import axios from 'axios';
import { query } from '../config/database';

/**
 * Weather Detection Service
 * Polls Open-Meteo API for rainfall data in Ahmedabad area.
 * Identifies precipitation events and triggers notification flow.
 *
 * Requirements: 1.1 - Detect rainfall and notify users within 5 minutes
 */

// Ahmedabad geographic bounds
export const AHMEDABAD_BOUNDS = {
  center: { lat: 23.0225, lng: 72.5714 },
  north: 23.12,
  south: 22.92,
  east: 72.70,
  west: 72.48,
} as const;

export interface RainfallEvent {
  latitude: number;
  longitude: number;
  precipitationMm: number;
  timestamp: Date;
}

export interface AffectedUser {
  id: string;
  phoneNumber: string;
  language: string;
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    precipitation: number; // mm
    rain: number; // mm
    weatherCode: number;
  };
  isRaining: boolean;
}

export interface WeatherServiceConfig {
  apiUrl: string;
  pollingIntervalMs: number;
  precipitationThresholdMm: number;
}

const DEFAULT_CONFIG: WeatherServiceConfig = {
  apiUrl: process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast',
  pollingIntervalMs: 5 * 60 * 1000, // 5 minutes
  precipitationThresholdMm: 0.1, // minimum mm to count as rainfall
};

export class WeatherService {
  private config: WeatherServiceConfig;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private onRainfallDetected: ((events: RainfallEvent[]) => void) | null = null;

  constructor(config: Partial<WeatherServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetch current weather data from Open-Meteo API for Ahmedabad center.
   * Open-Meteo is completely free with no API key required.
   */
  async pollWeatherData(): Promise<WeatherData> {
    const { lat, lng } = AHMEDABAD_BOUNDS.center;

    const response = await axios.get(this.config.apiUrl, {
      params: {
        latitude: lat,
        longitude: lng,
        current: 'precipitation,rain,weather_code',
        timezone: 'Asia/Kolkata',
      },
      timeout: 10000,
    });

    const data = response.data;
    const current = data.current;

    const weatherData: WeatherData = {
      latitude: data.latitude,
      longitude: data.longitude,
      current: {
        time: current.time,
        precipitation: current.precipitation ?? 0,
        rain: current.rain ?? 0,
        weatherCode: current.weather_code ?? 0,
      },
      isRaining: false,
    };

    weatherData.isRaining = this.detectRainfall(weatherData);
    return weatherData;
  }

  /**
   * Determine if the weather data indicates active rainfall.
   * Uses precipitation amount and WMO weather codes for rain (51-67, 80-82, 95-99).
   */
  detectRainfall(weatherData: WeatherData): boolean {
    const { precipitation, rain, weatherCode } = weatherData.current;

    // Check precipitation amount exceeds threshold
    if (precipitation >= this.config.precipitationThresholdMm || rain >= this.config.precipitationThresholdMm) {
      return true;
    }

    // WMO weather codes indicating rain:
    // 51-55: Drizzle, 56-57: Freezing drizzle
    // 61-65: Rain, 66-67: Freezing rain
    // 80-82: Rain showers, 95: Thunderstorm, 96-99: Thunderstorm with hail
    const rainCodes = new Set([
      51, 53, 55, 56, 57,
      61, 63, 65, 66, 67,
      80, 81, 82,
      95, 96, 99,
    ]);

    return rainCodes.has(weatherCode);
  }

  /**
   * Parse weather data into rainfall events for the Ahmedabad area.
   * Returns rainfall events only if precipitation is detected within bounds.
   */
  parseRainfallEvents(weatherData: WeatherData): RainfallEvent[] {
    if (!weatherData.isRaining) {
      return [];
    }

    if (!this.isWithinAhmedabadBounds(weatherData.latitude, weatherData.longitude)) {
      return [];
    }

    return [
      {
        latitude: weatherData.latitude,
        longitude: weatherData.longitude,
        precipitationMm: Math.max(weatherData.current.precipitation, weatherData.current.rain),
        timestamp: new Date(weatherData.current.time),
      },
    ];
  }

  /**
   * Check if coordinates fall within Ahmedabad geographic bounds.
   */
  isWithinAhmedabadBounds(lat: number, lng: number): boolean {
    return (
      lat >= AHMEDABAD_BOUNDS.south &&
      lat <= AHMEDABAD_BOUNDS.north &&
      lng >= AHMEDABAD_BOUNDS.west &&
      lng <= AHMEDABAD_BOUNDS.east
    );
  }

  /**
   * Register a callback for when rainfall is detected.
   */
  onRainfall(callback: (events: RainfallEvent[]) => void): void {
    this.onRainfallDetected = callback;
  }

  /**
   * Query users whose last known location falls within the rainfall area.
   * Uses PostGIS ST_DWithin to find users within a given radius of the rainfall point.
   *
   * @param latitude - Latitude of the rainfall center
   * @param longitude - Longitude of the rainfall center
   * @param radiusMeters - Search radius in meters (defaults to 5000m / 5km)
   * @returns Array of affected users with id, phone number, and language preference
   *
   * Requirements: 1.1 - Send notifications to users within affected areas
   */
  async getAffectedUsers(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000,
  ): Promise<AffectedUser[]> {
    const result = await query(
      `SELECT id, phone_number, language
       FROM users
       WHERE phone_verified = TRUE
         AND last_known_location IS NOT NULL
         AND ST_DWithin(
           last_known_location,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           $3
         )`,
      [longitude, latitude, radiusMeters],
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      phoneNumber: row.phone_number,
      language: row.language,
    }));
  }

  /**
   * Start polling weather data at the configured interval (default 5 minutes).
   */
  startPolling(): void {
    if (this.pollingTimer) {
      console.log('[WeatherService] Polling already active');
      return;
    }

    console.log(`[WeatherService] Starting polling every ${this.config.pollingIntervalMs / 1000}s`);

    // Run immediately, then on interval
    this.poll();
    this.pollingTimer = setInterval(() => this.poll(), this.config.pollingIntervalMs);
  }

  /**
   * Stop the polling timer.
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
      console.log('[WeatherService] Polling stopped');
    }
  }

  /**
   * Check if polling is currently active.
   */
  isPolling(): boolean {
    return this.pollingTimer !== null;
  }

  /**
   * Single poll cycle: fetch weather, detect rainfall, notify if needed.
   */
  private async poll(): Promise<void> {
    try {
      const weatherData = await this.pollWeatherData();
      const events = this.parseRainfallEvents(weatherData);

      if (events.length > 0 && this.onRainfallDetected) {
        console.log(`[WeatherService] Rainfall detected: ${events[0].precipitationMm}mm`);
        this.onRainfallDetected(events);
      }
    } catch (error) {
      console.error('[WeatherService] Poll error:', error instanceof Error ? error.message : error);
    }
  }
}

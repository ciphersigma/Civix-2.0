import { Pool } from 'pg';
import { cacheGetJSON, cacheSetJSON, cacheDelMultiple, cacheKeys } from '../utils/cache';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface CreateReportParams {
  userId: string;
  location: Location;
  severity: 'Low' | 'Medium' | 'High';
  reportType?: 'waterlogged' | 'clear';
}

interface Report {
  id: string;
  userId: string;
  location: Location;
  severity: 'Low' | 'Medium' | 'High';
  reportType: 'waterlogged' | 'clear';
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface CreateReportResult {
  success: boolean;
  report?: Report;
  message: string;
}

interface AreaStatus {
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  aggregateSeverity: 'Low' | 'Medium' | 'High';
  reportCount: number;
  mostRecentReport: Date;
  reportAge: string;
  reports: Report[];
}

export class ReportService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new waterlogging report
   * Validates GPS accuracy, daily report limit, and stores report with PostGIS geography
   */
  async createReport(params: CreateReportParams): Promise<CreateReportResult> {
    const { userId, location, severity, reportType = 'waterlogged' } = params;

    try {
      // Validate GPS accuracy (relaxed to 200 meters for better usability)
      if (location.accuracy > 200) {
        return {
          success: false,
          message: 'Location accuracy must be within 200 meters'
        };
      }

      // Validate coordinates
      if (!this.isValidCoordinate(location.latitude, location.longitude)) {
        return {
          success: false,
          message: 'Invalid location coordinates'
        };
      }

      // Check daily report limit (10 per user per day per requirement 9.4)
      const canSubmit = await this.checkDailyReportLimit(userId);
      if (!canSubmit) {
        return {
          success: false,
          message: 'Daily report limit reached'
        };
      }

      // Create report with PostGIS geography point
      // ST_SetSRID creates a geography point with SRID 4326 (WGS84)
      const result = await this.pool.query(
        `INSERT INTO waterlogging_reports 
         (user_id, location, location_accuracy, severity, report_type)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4, $5, $6)
         RETURNING 
           id,
           user_id,
           ST_Y(location::geometry) as latitude,
           ST_X(location::geometry) as longitude,
           location_accuracy,
           severity,
           report_type,
           created_at,
           expires_at,
           is_active`,
        [userId, location.longitude, location.latitude, location.accuracy, severity, reportType]
      );

      // Increment user's daily report count
      await this.incrementDailyReportCount(userId);

      const row = result.rows[0];
      const report: Report = {
        id: row.id,
        userId: row.user_id,
        location: {
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          accuracy: parseFloat(row.location_accuracy)
        },
        severity: row.severity,
        reportType: row.report_type,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isActive: row.is_active
      };

      // If this is a clear report, expire all active waterlogged reports in the area
      if (reportType === 'clear') {
        await this.expireWaterloggedReportsInArea(location);
      }

      return {
        success: true,
        report,
        message: 'Report created successfully'
      };
    } catch (error) {
      console.error('Create report error:', error);
      throw new Error('Failed to create report');
    }
  }

  /**
   * Expire active waterlogged reports in an area when a clear report is submitted
   * Uses PostGIS ST_DWithin to find reports within 500m radius
   * Requirement 6.4: Clear report should immediately expire all active waterlogged reports for that area
   */
  private async expireWaterloggedReportsInArea(location: Location): Promise<void> {
    try {
      // Find and expire all active waterlogged reports within 500m radius
      // ST_DWithin uses geography type for accurate distance calculation in meters
      await this.pool.query(
        `UPDATE waterlogging_reports
         SET is_active = false,
             updated_at = NOW()
         WHERE is_active = true
           AND report_type = 'waterlogged'
           AND ST_DWithin(
             location,
             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
             500
           )`,
        [location.longitude, location.latitude]
      );
    } catch (error) {
      console.error('Expire waterlogged reports error:', error);
      // Don't throw - clear report was already created
    }
  }

  /**
   * Check if user has reached daily report limit (10 reports per day)
   */
  private async checkDailyReportLimit(userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT daily_report_count, last_report_date
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const { daily_report_count, last_report_date } = result.rows[0];
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const lastReportDate = last_report_date ? new Date(last_report_date).toISOString().split('T')[0] : null;

      // If last report was on a different day, user can submit
      if (lastReportDate !== today) {
        return true;
      }

      // Check if user has reached the limit of 10 reports today
      return daily_report_count < 10;
    } catch (error) {
      console.error('Check daily report limit error:', error);
      return false;
    }
  }

  /**
   * Increment user's daily report count
   * Resets count if it's a new day
   */
  private async incrementDailyReportCount(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      await this.pool.query(
        `UPDATE users
         SET daily_report_count = CASE
           WHEN last_report_date::date = $2::date THEN daily_report_count + 1
           ELSE 1
         END,
         last_report_date = $2::date,
         updated_at = NOW()
         WHERE id = $1`,
        [userId, today]
      );
    } catch (error) {
      console.error('Increment daily report count error:', error);
      // Don't throw error - report was already created
    }
  }

  /**
   * Validate coordinate values
   */
  private isValidCoordinate(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }

  /**
   * Aggregate reports for a specific area
   * Uses PostGIS ST_DWithin to find reports within 500m radius
   * Calculates aggregate severity as maximum severity among reports
   * Requirement 5.1: Aggregate multiple reports for the same area within 1-hour period
   * Requirement 5.2, 5.3: Aggregate severity is the highest reported level
   * Requirement 5.4: Display count of reports contributing to area status
   */
  async aggregateReports(location: Location, radius: number = 500): Promise<AreaStatus | null> {
    try {
      // Check cache first
      const cacheKey = this.getAggregationCacheKey(location, radius);
      const cached = await this.getCachedAggregation(cacheKey);
      if (cached) {
        return cached;
      }

      // Query reports within specified radius and within 1-hour period
      // ST_DWithin uses geography type for accurate distance calculation in meters
      const result = await this.pool.query(
        `SELECT 
           id,
           user_id,
           ST_Y(location::geometry) as latitude,
           ST_X(location::geometry) as longitude,
           location_accuracy,
           severity,
           report_type,
           created_at,
           expires_at,
           is_active
         FROM waterlogging_reports
         WHERE is_active = true
           AND report_type = 'waterlogged'
           AND created_at >= NOW() - INTERVAL '1 hour'
           AND ST_DWithin(
             location,
             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
             $3
           )
         ORDER BY created_at DESC`,
        [location.longitude, location.latitude, radius]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Convert rows to Report objects
      const reports: Report[] = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        location: {
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          accuracy: parseFloat(row.location_accuracy)
        },
        severity: row.severity,
        reportType: row.report_type,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isActive: row.is_active
      }));

      // Calculate aggregate severity as maximum severity
      const aggregateSeverity = this.calculateMaxSeverity(reports);

      // Get most recent report timestamp
      const mostRecentReport = reports[0].createdAt; // Already sorted by created_at DESC

      // Calculate report age for display (Requirement 6.3)
      const reportAge = this.formatReportAge(mostRecentReport);

      const areaStatus: AreaStatus = {
        center: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        radius,
        aggregateSeverity,
        reportCount: reports.length,
        mostRecentReport,
        reportAge,
        reports
      };

      // Cache the result with 5-minute TTL
      await this.cacheAggregation(cacheKey, areaStatus);

      return areaStatus;
    } catch (error) {
      console.error('Aggregate reports error:', error);
      throw new Error('Failed to aggregate reports');
    }
  }

  /**
   * Format the age of the most recent report as a human-readable string
   * Requirement 6.3: Display age like "Updated 45 minutes ago"
   */
  private formatReportAge(mostRecentReport: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(mostRecentReport).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return 'Updated just now';
    } else if (diffMinutes === 1) {
      return 'Updated 1 minute ago';
    } else if (diffMinutes < 60) {
      return `Updated ${diffMinutes} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) {
        return 'Updated 1 hour ago';
      }
      return `Updated ${diffHours} hours ago`;
    }
  }

  /**
   * Calculate maximum severity from a list of reports
   * Severity hierarchy: High > Medium > Low
   */
  private calculateMaxSeverity(reports: Report[]): 'Low' | 'Medium' | 'High' {
    const severityOrder = { 'Low': 1, 'Medium': 2, 'High': 3 };
    
    let maxSeverity: 'Low' | 'Medium' | 'High' = 'Low';
    let maxSeverityValue = 0;

    for (const report of reports) {
      const severityValue = severityOrder[report.severity];
      if (severityValue > maxSeverityValue) {
        maxSeverityValue = severityValue;
        maxSeverity = report.severity;
      }
    }

    return maxSeverity;
  }

  /**
   * Generate cache key for aggregation based on location and radius
   * Rounds coordinates to 4 decimal places (~11m precision) for cache efficiency
   */
  private getAggregationCacheKey(location: Location, radius: number = 500): string {
    const lat = location.latitude.toFixed(4);
    const lng = location.longitude.toFixed(4);
    return `aggregation:${lat}:${lng}:${radius}`;
  }

  /**
   * Get cached aggregation result
   */
  private async getCachedAggregation(cacheKey: string): Promise<AreaStatus | null> {
    try {
      return await cacheGetJSON<AreaStatus>(cacheKey);
    } catch (error) {
      console.error('Get cached aggregation error:', error);
      return null;
    }
  }

  /**
   * Cache aggregation result with 5-minute TTL
   */
  private async cacheAggregation(cacheKey: string, areaStatus: AreaStatus): Promise<void> {
    try {
      const TTL_SECONDS = 5 * 60; // 5 minutes
      await cacheSetJSON(cacheKey, areaStatus, TTL_SECONDS);
    } catch (error) {
      console.error('Cache aggregation error:', error);
      // Don't throw - aggregation was successful, caching is optional
    }
  }

  /**
   * Expire reports older than 4 hours
   * Background job that runs every 5 minutes
   * Requirement 6.1: Mark reports older than 4 hours as inactive
   * Requirement 6.2: Remove expired areas from map within 5 minutes
   */
  async expireOldReports(): Promise<{ expiredCount: number; clearedCacheKeys: number }> {
    try {
      // Mark reports older than 4 hours as inactive
      const result = await this.pool.query(
        `UPDATE waterlogging_reports
         SET is_active = false,
             updated_at = NOW()
         WHERE is_active = true
           AND created_at < NOW() - INTERVAL '4 hours'
         RETURNING 
           ST_Y(location::geometry) as latitude,
           ST_X(location::geometry) as longitude`,
        []
      );

      const expiredCount = result.rows.length;

      if (expiredCount > 0) {
        console.log(`Expired ${expiredCount} old reports`);

        // Clear cache for affected areas (matching any radius)
        // Get unique location patterns (rounded to 4 decimal places for cache key matching)
        const uniquePatterns = new Set<string>();
        for (const row of result.rows) {
          const lat = parseFloat(row.latitude).toFixed(4);
          const lng = parseFloat(row.longitude).toFixed(4);
          uniquePatterns.add(`aggregation:${lat}:${lng}:*`);
        }

        // Find and delete all cache keys matching the location patterns
        let allKeys: string[] = [];
        for (const pattern of uniquePatterns) {
          const matchingKeys = await cacheKeys(pattern);
          allKeys = allKeys.concat(matchingKeys);
        }

        let clearedCacheKeys = 0;
        if (allKeys.length > 0) {
          clearedCacheKeys = await cacheDelMultiple(allKeys);
        }
        
        console.log(`Cleared ${clearedCacheKeys} cache keys for expired areas`);

        return { expiredCount, clearedCacheKeys };
      }

      return { expiredCount: 0, clearedCacheKeys: 0 };
    } catch (error) {
      console.error('Expire old reports error:', error);
      throw new Error('Failed to expire old reports');
    }
  }
}

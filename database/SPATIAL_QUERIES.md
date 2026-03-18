# PostGIS Spatial Queries Reference

This document provides examples of common spatial queries used in the Waterlogging Alert Platform.

## Creating Points

### From Latitude/Longitude
```sql
-- Create a point from coordinates (longitude, latitude)
-- Note: PostGIS uses (longitude, latitude) order, not (latitude, longitude)
SELECT ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography;
```

### Insert a Report with Location
```sql
INSERT INTO waterlogging_reports (user_id, location, severity, report_type)
VALUES (
  'user-uuid-here',
  ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography,
  'High',
  'waterlogged'
);
```

## Distance Queries

### Find Reports Within Radius
```sql
-- Find all active reports within 500 meters of a point
SELECT 
  id,
  severity,
  report_type,
  ST_Distance(location, ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography) as distance_meters
FROM waterlogging_reports
WHERE is_active = TRUE
  AND ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography,
    500  -- radius in meters
  )
ORDER BY distance_meters;
```

### Calculate Distance Between Two Points
```sql
-- Distance in meters between two points
SELECT ST_Distance(
  ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography,
  ST_SetSRID(ST_MakePoint(72.5800, 23.0300), 4326)::geography
) as distance_meters;
```

## Bounding Box Queries

### Find Reports Within Map Bounds
```sql
-- Find reports within a rectangular map viewport
-- Bounds: southwest (72.4, 22.9) to northeast (72.8, 23.2)
SELECT *
FROM waterlogging_reports
WHERE is_active = TRUE
  AND ST_Within(
    location::geometry,
    ST_MakeEnvelope(72.4, 22.9, 72.8, 23.2, 4326)
  );
```

### Find Reports in Ahmedabad City Bounds
```sql
-- Ahmedabad approximate bounds
-- Southwest: (72.4, 22.9), Northeast: (72.8, 23.2)
SELECT 
  id,
  severity,
  ST_X(location::geometry) as longitude,
  ST_Y(location::geometry) as latitude
FROM waterlogging_reports
WHERE is_active = TRUE
  AND location::geometry && ST_MakeEnvelope(72.4, 22.9, 72.8, 23.2, 4326);
```

## Aggregation Queries

### Group Reports by Area (500m radius)
```sql
-- Find clusters of reports within 500m of each other
WITH report_clusters AS (
  SELECT 
    r1.id,
    r1.location,
    r1.severity,
    COUNT(r2.id) as nearby_reports,
    MAX(r2.severity) as max_severity
  FROM waterlogging_reports r1
  LEFT JOIN waterlogging_reports r2 ON
    r1.id != r2.id
    AND r2.is_active = TRUE
    AND ST_DWithin(r1.location, r2.location, 500)
  WHERE r1.is_active = TRUE
  GROUP BY r1.id, r1.location, r1.severity
)
SELECT * FROM report_clusters
WHERE nearby_reports > 0
ORDER BY nearby_reports DESC;
```

### Calculate Aggregate Severity for Area
```sql
-- Get the highest severity level for reports within 500m of a point
SELECT 
  CASE 
    WHEN MAX(CASE WHEN severity = 'High' THEN 3 WHEN severity = 'Medium' THEN 2 ELSE 1 END) = 3 THEN 'High'
    WHEN MAX(CASE WHEN severity = 'High' THEN 3 WHEN severity = 'Medium' THEN 2 ELSE 1 END) = 2 THEN 'Medium'
    ELSE 'Low'
  END as aggregate_severity,
  COUNT(*) as report_count
FROM waterlogging_reports
WHERE is_active = TRUE
  AND ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography,
    500
  );
```

## Route-Related Queries

### Check if Route Intersects Waterlogged Areas
```sql
-- Check if a line (route) passes near any waterlogged areas
-- Route as array of points: [(72.57, 23.02), (72.58, 23.03), (72.59, 23.04)]
WITH route AS (
  SELECT ST_MakeLine(ARRAY[
    ST_SetSRID(ST_MakePoint(72.57, 23.02), 4326)::geometry,
    ST_SetSRID(ST_MakePoint(72.58, 23.03), 4326)::geometry,
    ST_SetSRID(ST_MakePoint(72.59, 23.04), 4326)::geometry
  ]) as line
)
SELECT 
  r.id,
  r.severity,
  ST_Distance(r.location, route.line::geography) as distance_meters
FROM waterlogging_reports r, route
WHERE r.is_active = TRUE
  AND ST_DWithin(r.location, route.line::geography, 200)  -- Within 200m of route
ORDER BY distance_meters;
```

### Find Waterlogged Areas Along Route
```sql
-- Find all waterlogged areas within 200m of a route
SELECT DISTINCT ON (r.id)
  r.id,
  r.severity,
  r.location,
  ST_Distance(
    r.location,
    ST_ClosestPoint(
      ST_MakeLine(ARRAY[
        ST_SetSRID(ST_MakePoint(72.57, 23.02), 4326)::geometry,
        ST_SetSRID(ST_MakePoint(72.58, 23.03), 4326)::geometry
      ]),
      r.location::geometry
    )::geography
  ) as distance_to_route
FROM waterlogging_reports r
WHERE r.is_active = TRUE
  AND r.report_type = 'waterlogged'
  AND ST_DWithin(
    r.location,
    ST_MakeLine(ARRAY[
      ST_SetSRID(ST_MakePoint(72.57, 23.02), 4326)::geometry,
      ST_SetSRID(ST_MakePoint(72.58, 23.03), 4326)::geometry
    ])::geography,
    200
  )
ORDER BY r.id, distance_to_route;
```

## Utility Queries

### Extract Coordinates from Geography
```sql
-- Get latitude and longitude from geography column
SELECT 
  id,
  ST_Y(location::geometry) as latitude,
  ST_X(location::geometry) as longitude
FROM waterlogging_reports;
```

### Convert Between Geometry and Geography
```sql
-- Geography to Geometry
SELECT location::geometry FROM waterlogging_reports;

-- Geometry to Geography
SELECT ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography;
```

### Check PostGIS Functions Available
```sql
-- List all PostGIS functions
SELECT proname 
FROM pg_proc 
WHERE proname LIKE 'st_%' 
ORDER BY proname;
```

## Performance Tips

1. **Always use spatial indexes**: The GIST indexes on location columns make spatial queries fast
2. **Use ST_DWithin instead of ST_Distance**: ST_DWithin uses the spatial index, ST_Distance does not
3. **Cast to geography for distance in meters**: Geography type gives accurate distances in meters
4. **Use bounding box (&&) for initial filtering**: Then apply more precise spatial functions
5. **Limit results**: Use LIMIT and ORDER BY distance for nearest neighbor queries

## Common Patterns

### Nearest Neighbor Query
```sql
-- Find 10 nearest reports to a point
SELECT 
  id,
  severity,
  ST_Distance(location, ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography) as distance
FROM waterlogging_reports
WHERE is_active = TRUE
ORDER BY location <-> ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geometry
LIMIT 10;
```

### Heat Map Data
```sql
-- Get report density for heat map visualization
SELECT 
  ST_X(location::geometry) as lng,
  ST_Y(location::geometry) as lat,
  severity,
  COUNT(*) OVER (
    PARTITION BY ST_SnapToGrid(location::geometry, 0.01)
  ) as density
FROM waterlogging_reports
WHERE is_active = TRUE
  AND created_at > NOW() - INTERVAL '1 hour';
```

## Testing Queries

### Insert Test Data
```sql
-- Insert test reports in different locations
INSERT INTO waterlogging_reports (user_id, location, severity, report_type)
VALUES 
  ('00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography, 'High', 'waterlogged'),
  ('00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(72.5800, 23.0300), 4326)::geography, 'Medium', 'waterlogged'),
  ('00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(72.5900, 23.0400), 4326)::geography, 'Low', 'waterlogged');
```

### Verify Spatial Index Usage
```sql
-- Check if query uses spatial index
EXPLAIN ANALYZE
SELECT *
FROM waterlogging_reports
WHERE is_active = TRUE
  AND ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography,
    500
  );
-- Look for "Index Scan using idx_reports_location" in output
```

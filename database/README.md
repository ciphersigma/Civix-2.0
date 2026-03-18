# Database Setup

PostgreSQL with PostGIS extension and Redis cache for the Waterlogging Alert Platform.

## Quick Start (Neon)

### 1. Create Neon Project
1. Sign up at [neon.tech](https://neon.tech)
2. Create new project (choose AWS Mumbai region for India)
3. Copy connection string

### 2. Setup Database
```bash
# Update .env with your Neon connection string
cp .env.example .env
# Edit DATABASE_URL in .env

# Run migrations
npm run db:migrate

# Verify setup
npm run db:test
```

## Commands

```bash
npm run db:migrate  # Run schema migrations
npm run db:test     # Test connection
```

## Hosted Database Options

### Neon (Recommended for India)
1. Create account at [neon.tech](https://neon.tech/)
2. Create new project (AWS Mumbai region)
3. Copy connection string
4. Update `.env`: `DATABASE_URL=your-neon-connection-string`
5. Run: `npm run db:migrate`

### Supabase (Alternative - if accessible)
1. Create account at [supabase.com](https://supabase.com/)
2. Create new project
3. Get connection string from Project Settings → Database
4. Update `.env` with connection string
5. Run: `npm run db:migrate`

## Schema Files

The schema is organized in numbered files that should be executed in order:

1. **00_init.sql** - Initializes PostGIS and UUID extensions
2. **01_users.sql** - Creates users table with phone verification
3. **02_waterlogging_reports.sql** - Creates reports table with geography column and spatial indexes
4. **03_notifications.sql** - Creates notifications table for tracking sent notifications

## Database Schema Overview

### Tables

#### users
Stores user accounts with phone verification for authentication.
- Primary key: `id` (UUID)
- Unique constraint: `phone_number`
- Supports: English, Hindi, Gujarati languages
- Tracks: Daily report limits (max 10 per day)

#### waterlogging_reports
Crowdsourced waterlogging reports with geospatial data.
- Primary key: `id` (UUID)
- Foreign key: `user_id` references users
- Geography column: `location` (POINT, SRID 4326)
- Severity levels: Low, Medium, High
- Report types: waterlogged, clear
- Auto-expires: 4 hours after creation

#### notifications
Tracks all notifications sent to users and their responses.
- Primary key: `id` (UUID)
- Foreign key: `user_id` references users
- Types: rain_detection, navigation_alert, route_update, proximity_alert
- Stores: User responses in JSONB format
- Rate limiting: Built-in function for notification frequency checks

### Spatial Indexes

The schema includes PostGIS spatial indexes for efficient location queries:

- `idx_reports_location` - GIST index on location column
- `idx_reports_active_location` - GIST index for active reports only

These indexes enable fast queries like:
- Find all reports within a radius
- Find reports within map bounds
- Calculate distances between points

### Example Spatial Queries

Find reports within 500 meters of a location:
```sql
SELECT *
FROM waterlogging_reports
WHERE is_active = TRUE
  AND ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326)::geography,
    500
  );
```

Find reports within map bounds:
```sql
SELECT *
FROM waterlogging_reports
WHERE is_active = TRUE
  AND ST_Within(
    location::geometry,
    ST_MakeEnvelope(72.4, 22.9, 72.8, 23.2, 4326)
  );
```

## Connection String Format

For local Docker:
```
postgresql://postgres:postgres@localhost:5432/waterlogging_platform
```

For hosted services, use the connection string provided by your provider.

## Environment Variables

Add these to your `.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/waterlogging_platform
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=waterlogging_platform
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

## Maintenance

### Expire Old Reports (Run periodically)
```sql
UPDATE waterlogging_reports
SET is_active = FALSE
WHERE is_active = TRUE
  AND expires_at < NOW();
```

### Reset Daily Report Counts (Run daily at midnight)
```sql
UPDATE users
SET daily_report_count = 0
WHERE last_report_date < CURRENT_DATE;
```

### Clean Up Old Notifications (Run weekly)
```sql
DELETE FROM notifications
WHERE sent_at < NOW() - INTERVAL '30 days';
```

-- Add FCM token and weather alert preferences to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weather_alerts_enabled BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_users_fcm ON users(fcm_token) WHERE fcm_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_weather_alerts ON users(weather_alerts_enabled) WHERE weather_alerts_enabled = TRUE;

COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
COMMENT ON COLUMN users.weather_alerts_enabled IS 'Whether user wants rain/weather push notifications';

-- Weather alert log table
CREATE TABLE IF NOT EXISTS weather_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    precipitation_mm DOUBLE PRECISION NOT NULL,
    weather_code INTEGER,
    description TEXT,
    radius_meters INTEGER DEFAULT 5000,
    users_notified INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_alerts_created ON weather_alerts(created_at DESC);

COMMENT ON TABLE weather_alerts IS 'Log of weather alert events triggered by the cron job';

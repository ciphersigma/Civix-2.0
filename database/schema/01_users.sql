-- Users table with phone verification fields
-- Stores user authentication and profile information

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_expires_at TIMESTAMP,
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'hi', 'gu')),
    daily_report_count INTEGER DEFAULT 0,
    last_report_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_known_location GEOGRAPHY(POINT, 4326),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for phone number lookups
CREATE INDEX idx_users_phone ON users(phone_number);

-- PostGIS spatial index for user location queries (finding users in rainfall areas)
CREATE INDEX idx_users_location ON users USING GIST(last_known_location) WHERE last_known_location IS NOT NULL;

-- Index for verification status queries
CREATE INDEX idx_users_verified ON users(phone_verified);

-- Index for daily report limit checks
CREATE INDEX idx_users_report_limit ON users(last_report_date, daily_report_count);

-- Comments for documentation
COMMENT ON TABLE users IS 'Stores user accounts with phone verification for authentication';
COMMENT ON COLUMN users.phone_number IS 'User mobile phone number in E.164 format';
COMMENT ON COLUMN users.phone_verified IS 'Whether the phone number has been verified via SMS code';
COMMENT ON COLUMN users.verification_code IS 'Temporary 6-digit SMS verification code';
COMMENT ON COLUMN users.verification_expires_at IS 'Expiration timestamp for verification code';
COMMENT ON COLUMN users.language IS 'User preferred language: en (English), hi (Hindi), gu (Gujarati)';
COMMENT ON COLUMN users.daily_report_count IS 'Number of reports submitted today (max 10)';
COMMENT ON COLUMN users.last_report_date IS 'Date of last report submission for daily limit tracking';
COMMENT ON COLUMN users.last_known_location IS 'User last known GPS location as PostGIS geography point (SRID 4326)';

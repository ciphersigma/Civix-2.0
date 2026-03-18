-- Add firebase_uid column to users table for Firebase Phone Auth integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);

-- Index for Firebase UID lookups
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid) WHERE firebase_uid IS NOT NULL;

COMMENT ON COLUMN users.firebase_uid IS 'Firebase Authentication UID for phone auth integration';

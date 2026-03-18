-- Admin users table for dashboard access
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Insert default admin user
-- Email: prashantchettiyar@ieee.org
-- Password: Prash@31
-- Password hash generated with bcrypt (10 rounds)
INSERT INTO admin_users (email, password_hash, name)
VALUES (
  'prashantchettiyar@ieee.org',
  '$2b$10$VCCPmOVFyB0abtryEW855ua1OaKvnxxG0KAPHkFR./1Gv2qvmbgu.',
  'Prashant Chettiyar'
)
ON CONFLICT (email) DO NOTHING;

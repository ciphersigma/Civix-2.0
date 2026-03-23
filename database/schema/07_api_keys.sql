-- API keys for delivery partners
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  secret_hash VARCHAR(255) NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read:reports'],
  rate_limit INTEGER DEFAULT 1000,        -- requests per hour
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP,
  request_count BIGINT DEFAULT 0,
  webhook_url TEXT,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_partner ON api_keys(partner_name);

-- API request logs for analytics
CREATE TABLE IF NOT EXISTS api_request_logs (
  id BIGSERIAL PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_key ON api_request_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_time ON api_request_logs(created_at DESC);

COMMENT ON TABLE api_keys IS 'API keys for delivery partner integrations';
COMMENT ON TABLE api_request_logs IS 'Request logs for API usage analytics';

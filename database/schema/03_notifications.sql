-- Notifications table for tracking sent notifications
-- Stores notification history and user responses

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('rain_detection', 'navigation_alert', 'route_update', 'proximity_alert')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB, -- Additional notification payload data
    sent_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    response JSONB, -- User response data
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for user's notification history
CREATE INDEX idx_notifications_user ON notifications(user_id, sent_at DESC);

-- Index for notification type queries
CREATE INDEX idx_notifications_type ON notifications(type, sent_at DESC);

-- Index for rate limiting checks (recent notifications per user)
-- Note: Removed WHERE clause with NOW() as it's not immutable
-- Rate limiting will be handled in application logic
CREATE INDEX idx_notifications_rate_limit ON notifications(user_id, type, sent_at);

-- Index for response tracking
CREATE INDEX idx_notifications_response ON notifications(responded_at) WHERE responded_at IS NOT NULL;

-- GIN index for JSONB data queries
CREATE INDEX idx_notifications_data ON notifications USING GIN(data);

-- Comments for documentation
COMMENT ON TABLE notifications IS 'Tracks all notifications sent to users and their responses';
COMMENT ON COLUMN notifications.type IS 'Notification type: rain_detection, navigation_alert, route_update, proximity_alert';
COMMENT ON COLUMN notifications.title IS 'Notification title displayed to user';
COMMENT ON COLUMN notifications.body IS 'Notification body text';
COMMENT ON COLUMN notifications.data IS 'Additional structured data (JSON) for notification payload';
COMMENT ON COLUMN notifications.sent_at IS 'Timestamp when notification was sent';
COMMENT ON COLUMN notifications.responded_at IS 'Timestamp when user responded to notification';
COMMENT ON COLUMN notifications.response IS 'User response data (JSON) - e.g., Yes/No answers, severity selection';

-- Function to check notification rate limit (max 1 rain notification per 2 hours)
CREATE OR REPLACE FUNCTION check_notification_rate_limit(
    p_user_id UUID,
    p_notification_type VARCHAR(30),
    p_time_window INTERVAL DEFAULT INTERVAL '2 hours'
)
RETURNS BOOLEAN AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO recent_count
    FROM notifications
    WHERE user_id = p_user_id
      AND type = p_notification_type
      AND sent_at > NOW() - p_time_window;
    
    RETURN recent_count = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_notification_rate_limit IS 'Checks if user can receive notification based on rate limit (default: 1 per 2 hours)';

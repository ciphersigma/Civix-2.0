-- Community verification: upvote/downvote reports
CREATE TABLE IF NOT EXISTS report_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES waterlogging_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote SMALLINT NOT NULL CHECK (vote IN (1, -1)), -- 1 = confirm, -1 = deny
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(report_id, user_id) -- one vote per user per report
);

CREATE INDEX IF NOT EXISTS idx_votes_report ON report_votes(report_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON report_votes(user_id);

-- Add vote counts to reports table for fast reads
ALTER TABLE waterlogging_reports ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
ALTER TABLE waterlogging_reports ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;
ALTER TABLE waterlogging_reports ADD COLUMN IF NOT EXISTS trust_score NUMERIC(3,2) DEFAULT 0.50;

COMMENT ON TABLE report_votes IS 'Community verification votes on waterlogging reports';
COMMENT ON COLUMN waterlogging_reports.upvotes IS 'Number of users who confirmed this report';
COMMENT ON COLUMN waterlogging_reports.downvotes IS 'Number of users who denied this report';
COMMENT ON COLUMN waterlogging_reports.trust_score IS 'Credibility score 0-1 based on votes (0.5 = neutral)';

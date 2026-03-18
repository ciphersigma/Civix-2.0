-- Waterlogging reports table with geography column and spatial indexes
-- Stores crowdsourced waterlogging reports with location and severity

CREATE TABLE waterlogging_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    location_accuracy NUMERIC(5, 2), -- GPS accuracy in meters
    severity VARCHAR(10) CHECK (severity IN ('Low', 'Medium', 'High')),
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('waterlogged', 'clear')),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- PostGIS spatial index for location-based queries (most important index)
CREATE INDEX idx_reports_location ON waterlogging_reports USING GIST(location);

-- Composite index for active reports with expiry time (for cleanup jobs)
CREATE INDEX idx_reports_active_expiry ON waterlogging_reports(is_active, expires_at) WHERE is_active = TRUE;

-- Index for user's reports lookup
CREATE INDEX idx_reports_user ON waterlogging_reports(user_id, created_at DESC);

-- Index for report type filtering
CREATE INDEX idx_reports_type ON waterlogging_reports(report_type, is_active);

-- Index for time-based queries (recent reports)
CREATE INDEX idx_reports_created ON waterlogging_reports(created_at DESC);

-- Composite spatial index for active reports within geographic bounds
CREATE INDEX idx_reports_active_location ON waterlogging_reports USING GIST(location) WHERE is_active = TRUE;

-- Comments for documentation
COMMENT ON TABLE waterlogging_reports IS 'Crowdsourced waterlogging reports with geospatial data';
COMMENT ON COLUMN waterlogging_reports.location IS 'Geographic point in WGS84 (SRID 4326) - latitude/longitude';
COMMENT ON COLUMN waterlogging_reports.location_accuracy IS 'GPS accuracy in meters (should be within 50m per requirements)';
COMMENT ON COLUMN waterlogging_reports.severity IS 'Waterlogging severity: Low (yellow), Medium (orange), High (red)';
COMMENT ON COLUMN waterlogging_reports.report_type IS 'Type of report: waterlogged (area has water) or clear (area is dry)';
COMMENT ON COLUMN waterlogging_reports.expires_at IS 'Report expiration time (4 hours from creation per requirements)';
COMMENT ON COLUMN waterlogging_reports.is_active IS 'Whether report is currently active (not expired or cleared)';

-- Function to automatically set expires_at to 4 hours from creation
CREATE OR REPLACE FUNCTION set_report_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := NEW.created_at + INTERVAL '4 hours';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set expiry time on insert
CREATE TRIGGER trigger_set_report_expiry
    BEFORE INSERT ON waterlogging_reports
    FOR EACH ROW
    EXECUTE FUNCTION set_report_expiry();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
CREATE TRIGGER trigger_update_reports_timestamp
    BEFORE UPDATE ON waterlogging_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

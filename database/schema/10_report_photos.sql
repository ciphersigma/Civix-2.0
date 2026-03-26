-- Add photo column to waterlogging reports
ALTER TABLE waterlogging_reports ADD COLUMN IF NOT EXISTS photo TEXT;

COMMENT ON COLUMN waterlogging_reports.photo IS 'Base64 encoded photo evidence of waterlogging';

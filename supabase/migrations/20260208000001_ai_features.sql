-- Migration: AI Features Tables
-- Description: Add tables for AI-powered features (reports, photo analysis, insights, fraud detection)
-- Author: Claude Code Audit
-- Date: 2026-02-08

-- ============================================
-- AI Report Cache
-- Stores generated AI reports for quick retrieval
-- ============================================
CREATE TABLE IF NOT EXISTS ai_report_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  report_markdown TEXT,
  report_html TEXT,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id)
);

-- Add index for job lookups
CREATE INDEX IF NOT EXISTS idx_ai_report_cache_job ON ai_report_cache(job_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_report_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_report_cache_updated_at ON ai_report_cache;
CREATE TRIGGER trigger_ai_report_cache_updated_at
  BEFORE UPDATE ON ai_report_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_report_cache_updated_at();

-- ============================================
-- AI Photo Analysis
-- Stores Google Vision analysis results
-- ============================================
CREATE TABLE IF NOT EXISTS ai_photo_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL,
  analysis_json JSONB,
  cleanliness_score INTEGER CHECK (cleanliness_score >= 0 AND cleanliness_score <= 100),
  detected_labels TEXT[],
  detected_issues TEXT[],
  confidence DECIMAL(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  staff_override BOOLEAN DEFAULT FALSE,
  staff_override_note TEXT,
  override_by UUID,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_photo_analysis_photo ON ai_photo_analysis(photo_id);
CREATE INDEX IF NOT EXISTS idx_ai_photo_analysis_score ON ai_photo_analysis(cleanliness_score);
CREATE INDEX IF NOT EXISTS idx_ai_photo_analysis_analyzed ON ai_photo_analysis(analyzed_at DESC);

-- ============================================
-- AI Insights
-- Stores AI-generated business insights
-- ============================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('performance', 'efficiency', 'pattern', 'recommendation', 'warning', 'trend')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  data_context JSONB,
  confidence DECIMAL(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_by UUID,
  dismissed_at TIMESTAMPTZ,
  is_actioned BOOLEAN DEFAULT FALSE,
  actioned_by UUID,
  actioned_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_valid ON ai_insights(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_ai_insights_active ON ai_insights(is_dismissed, valid_until) WHERE is_dismissed = FALSE;
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority DESC, created_at DESC);

-- ============================================
-- AI Fraud Flags
-- Stores detected anomalies and potential fraud
-- ============================================
CREATE TABLE IF NOT EXISTS ai_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('photo_reuse', 'gps_spoof', 'impossible_travel', 'time_anomaly', 'pattern_suspicious', 'checkin_without_work')),
  evidence_json JSONB NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence DECIMAL(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  is_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_outcome TEXT CHECK (review_outcome IS NULL OR review_outcome IN ('confirmed', 'false_positive', 'needs_investigation', 'dismissed')),
  review_notes TEXT,
  is_escalated BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_fraud_flags_staff ON ai_fraud_flags(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_fraud_flags_job ON ai_fraud_flags(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_fraud_flags_type ON ai_fraud_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_ai_fraud_flags_unreviewed ON ai_fraud_flags(is_reviewed, severity) WHERE is_reviewed = FALSE;
CREATE INDEX IF NOT EXISTS idx_ai_fraud_flags_recent ON ai_fraud_flags(created_at DESC);

-- ============================================
-- AI Time Predictions
-- Stores predicted vs actual cleaning times for ML
-- ============================================
CREATE TABLE IF NOT EXISTS ai_time_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  staff_id UUID,
  property_type TEXT,
  predicted_minutes INTEGER NOT NULL CHECK (predicted_minutes > 0),
  actual_minutes INTEGER CHECK (actual_minutes IS NULL OR actual_minutes > 0),
  accuracy_delta INTEGER, -- actual - predicted (populated after job completion)
  features_used JSONB, -- Input features: bedrooms, bathrooms, sqm, furniture counts
  model_version TEXT DEFAULT 'v1',
  prediction_confidence DECIMAL(4,3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_time_predictions_property ON ai_time_predictions(property_id);
CREATE INDEX IF NOT EXISTS idx_ai_time_predictions_staff ON ai_time_predictions(staff_id);
CREATE INDEX IF NOT EXISTS idx_ai_time_predictions_job ON ai_time_predictions(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_time_predictions_type ON ai_time_predictions(property_type);
CREATE INDEX IF NOT EXISTS idx_ai_time_predictions_completed ON ai_time_predictions(completed_at) WHERE completed_at IS NOT NULL;

-- ============================================
-- Image Hash Table (for duplicate detection)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_image_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  perceptual_hash TEXT NOT NULL, -- pHash for image similarity
  average_hash TEXT, -- aHash for quick comparison
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  staff_id UUID,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for hash lookups
CREATE INDEX IF NOT EXISTS idx_ai_image_hashes_photo ON ai_image_hashes(photo_id);
CREATE INDEX IF NOT EXISTS idx_ai_image_hashes_phash ON ai_image_hashes(perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_ai_image_hashes_staff ON ai_image_hashes(staff_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_image_hashes_job ON ai_image_hashes(job_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all AI tables
ALTER TABLE ai_report_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_photo_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_time_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_image_hashes ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AI Report Cache: Admins full access, staff can read their own job reports
CREATE POLICY "ai_report_cache_admin_all" ON ai_report_cache
  FOR ALL USING (is_admin());

CREATE POLICY "ai_report_cache_staff_select" ON ai_report_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = ai_report_cache.job_id
      AND jobs.assigned_staff_id = auth.uid()
    )
  );

-- AI Photo Analysis: Admins full access, staff can read their job photos
CREATE POLICY "ai_photo_analysis_admin_all" ON ai_photo_analysis
  FOR ALL USING (is_admin());

CREATE POLICY "ai_photo_analysis_staff_select" ON ai_photo_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM job_photos jp
      JOIN jobs j ON j.id = jp.job_id
      WHERE jp.id::text = ai_photo_analysis.photo_id::text
      AND j.assigned_staff_id = auth.uid()
    )
  );

-- AI Insights: Admins only
CREATE POLICY "ai_insights_admin_all" ON ai_insights
  FOR ALL USING (is_admin());

-- AI Fraud Flags: Admins only (sensitive data)
CREATE POLICY "ai_fraud_flags_admin_all" ON ai_fraud_flags
  FOR ALL USING (is_admin());

-- AI Time Predictions: Admins full access
CREATE POLICY "ai_time_predictions_admin_all" ON ai_time_predictions
  FOR ALL USING (is_admin());

-- AI Image Hashes: Admins only
CREATE POLICY "ai_image_hashes_admin_all" ON ai_image_hashes
  FOR ALL USING (is_admin());

-- ============================================
-- Useful Views for AI Features
-- ============================================

-- View: Active insights (not dismissed, still valid)
CREATE OR REPLACE VIEW ai_active_insights AS
SELECT
  id,
  insight_type,
  title,
  content,
  data_context,
  confidence,
  priority,
  valid_from,
  valid_until,
  created_at
FROM ai_insights
WHERE is_dismissed = FALSE
  AND valid_until > NOW()
ORDER BY priority DESC, created_at DESC;

-- View: Pending fraud reviews
CREATE OR REPLACE VIEW ai_pending_fraud_reviews AS
SELECT
  ff.id,
  ff.flag_type,
  ff.severity,
  ff.evidence_json,
  ff.confidence,
  ff.created_at,
  ff.job_id,
  p.full_name as staff_name,
  p.email as staff_email,
  j.scheduled_date,
  j.location
FROM ai_fraud_flags ff
LEFT JOIN profiles p ON p.user_id = ff.staff_id
LEFT JOIN jobs j ON j.id = ff.job_id
WHERE ff.is_reviewed = FALSE
ORDER BY
  CASE ff.severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  ff.created_at DESC;

-- View: Photo analysis summary by job
CREATE OR REPLACE VIEW ai_job_photo_analysis_summary AS
SELECT
  jp.job_id,
  COUNT(*) as total_photos,
  COUNT(pa.id) as analyzed_photos,
  AVG(pa.cleanliness_score) as avg_cleanliness_score,
  MIN(pa.cleanliness_score) as min_cleanliness_score,
  MAX(pa.cleanliness_score) as max_cleanliness_score,
  COUNT(*) FILTER (WHERE pa.cleanliness_score < 70) as low_score_count,
  AVG(pa.confidence) as avg_confidence
FROM job_photos jp
LEFT JOIN ai_photo_analysis pa ON pa.photo_id::text = jp.id::text
GROUP BY jp.job_id;

-- ============================================
-- Functions for AI Features
-- ============================================

-- Function to get AI insights for dashboard
CREATE OR REPLACE FUNCTION get_active_insights(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  insight_type TEXT,
  title TEXT,
  content TEXT,
  priority INTEGER,
  confidence DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.insight_type,
    i.title,
    i.content,
    i.priority,
    i.confidence,
    i.created_at
  FROM ai_insights i
  WHERE i.is_dismissed = FALSE
    AND i.valid_until > NOW()
  ORDER BY i.priority DESC, i.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to dismiss an insight
CREATE OR REPLACE FUNCTION dismiss_insight(insight_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ai_insights
  SET
    is_dismissed = TRUE,
    dismissed_by = auth.uid(),
    dismissed_at = NOW()
  WHERE id = insight_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get fraud flags for a staff member
CREATE OR REPLACE FUNCTION get_staff_fraud_flags(target_staff_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  id UUID,
  flag_type TEXT,
  severity TEXT,
  evidence_json JSONB,
  is_reviewed BOOLEAN,
  review_outcome TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ff.id,
    ff.flag_type,
    ff.severity,
    ff.evidence_json,
    ff.is_reviewed,
    ff.review_outcome,
    ff.created_at
  FROM ai_fraud_flags ff
  WHERE ff.staff_id = target_staff_id
    AND ff.created_at > NOW() - (days_back || ' days')::INTERVAL
  ORDER BY ff.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE ai_report_cache IS 'Stores AI-generated PDF reports for jobs, cached for quick retrieval';
COMMENT ON TABLE ai_photo_analysis IS 'Stores Google Vision analysis results for cleaning photos';
COMMENT ON TABLE ai_insights IS 'Stores AI-generated business insights and recommendations';
COMMENT ON TABLE ai_fraud_flags IS 'Stores detected anomalies and potential fraud indicators';
COMMENT ON TABLE ai_time_predictions IS 'Stores ML-based time predictions for training and accuracy tracking';
COMMENT ON TABLE ai_image_hashes IS 'Stores perceptual hashes for detecting duplicate/reused photos';

COMMENT ON COLUMN ai_photo_analysis.cleanliness_score IS 'AI-calculated cleanliness score from 0-100';
COMMENT ON COLUMN ai_photo_analysis.staff_override IS 'If TRUE, staff disagreed with AI analysis';
COMMENT ON COLUMN ai_fraud_flags.evidence_json IS 'JSON containing evidence data (GPS coords, timestamps, photo URLs, etc.)';
COMMENT ON COLUMN ai_time_predictions.accuracy_delta IS 'Actual minutes minus predicted minutes; negative means faster than predicted';

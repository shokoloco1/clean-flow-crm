-- Migration: Create job_area_photos table for area-based photo validation
-- This enables per-area before/after photo documentation

-- Create job_area_photos table
CREATE TABLE IF NOT EXISTS job_area_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  service_type TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  notes TEXT,
  uploaded_by UUID REFERENCES profiles(user_id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add required_areas column to jobs table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'required_areas'
  ) THEN
    ALTER TABLE jobs ADD COLUMN required_areas JSONB;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_area_photos_job_id ON job_area_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_area_photos_status ON job_area_photos(status);

-- Enable RLS on job_area_photos
ALTER TABLE job_area_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_area_photos

-- Staff can view photos for their assigned jobs
CREATE POLICY "Staff can view their job area photos"
  ON job_area_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_area_photos.job_id
      AND j.assigned_staff_id = auth.uid()
    )
  );

-- Staff can insert/update photos for their assigned jobs
CREATE POLICY "Staff can add photos to their jobs"
  ON job_area_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_area_photos.job_id
      AND j.assigned_staff_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update photos for their jobs"
  ON job_area_photos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_area_photos.job_id
      AND j.assigned_staff_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all job area photos"
  ON job_area_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_job_area_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_job_area_photos_updated_at ON job_area_photos;
CREATE TRIGGER trigger_job_area_photos_updated_at
  BEFORE UPDATE ON job_area_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_job_area_photos_updated_at();

-- Comments for documentation
COMMENT ON TABLE job_area_photos IS 'Stores before/after photos for each area of a job';
COMMENT ON COLUMN job_area_photos.area_name IS 'Name of the area (e.g., Living room, Bedroom 1)';
COMMENT ON COLUMN job_area_photos.service_type IS 'Type of cleaning service for this area';
COMMENT ON COLUMN job_area_photos.status IS 'pending = needs more photos, completed = has both before and after';
COMMENT ON COLUMN jobs.required_areas IS 'JSON array of areas that need photo documentation';

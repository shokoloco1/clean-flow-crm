-- Add new address fields to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS suburb TEXT,
ADD COLUMN IF NOT EXISTS post_code TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS google_maps_link TEXT;

-- Update property_type check to only allow commercial, airbnb, other
-- First update existing data to valid types
UPDATE public.properties SET property_type = 'other' WHERE property_type NOT IN ('commercial', 'airbnb', 'other');

-- Note: We keep the existing columns (location_lat, location_lng, geofence_radius_meters) 
-- in the database for backwards compatibility but won't use them in the UI
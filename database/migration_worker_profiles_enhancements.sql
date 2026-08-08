/* ===================================================================
   WorkHire Phase 3 - Worker Profiles & Directory Enhancements
   
   Adds skills, availability, location, bio, and hourly_rate columns
   to worker_profiles per SRS Section 5.2
   =================================================================== */

BEGIN;

ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS availability BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) CHECK (hourly_rate IS NULL OR hourly_rate >= 0);

CREATE INDEX IF NOT EXISTS idx_worker_profiles_availability ON worker_profiles (availability) WHERE availability = TRUE;
CREATE INDEX IF NOT EXISTS idx_worker_profiles_verification ON worker_profiles (verification_status);

COMMIT;

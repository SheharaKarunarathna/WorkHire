BEGIN;

CREATE TABLE IF NOT EXISTS worker_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    time_zone TEXT NOT NULL DEFAULT 'UTC',
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    booked_request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT worker_schedule_time_check CHECK (end_time > start_time)
);

-- Index for searching worker availability by date
CREATE INDEX IF NOT EXISTS idx_worker_schedules_worker_date 
ON worker_schedules (worker_account_id, slot_date, is_booked);

-- Unique index to prevent duplicate/overlapping identical slots for the same worker
CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_schedules_unique_slot
ON worker_schedules (worker_account_id, slot_date, start_time, end_time);

COMMIT;

BEGIN;

create extension if not exists pgcrypto; /* From pgcrypto we generate random UUIDs Universal unique identifiers for our users and posts. This way we don't have to worry about collisions and we can easily generate new IDs without having to query the database for the last ID. */
create extension if not exists citext; /* Since we are going to use emails as unique identifiers for users, we need to make sure that the email column is case-insensitive. So whether typed from upper or lower doesn't matter */

DO $$ /*Raw SQL CREATE TYPE doesn't support IF NOT EXISTS syntax before PostgreSQL 13. That's why we put the logic in a DO block */
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role') THEN
        CREATE TYPE account_role AS ENUM ('user', 'worker', 'admin', 'operator');
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role')
       AND NOT EXISTS (
           SELECT 1
           FROM pg_enum e
           JOIN pg_type t ON t.oid = e.enumtypid
           WHERE t.typname = 'account_role'
             AND e.enumlabel = 'operator'
       ) THEN
        ALTER TYPE account_role ADD VALUE 'operator';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_type') THEN
        CREATE TYPE request_type AS ENUM ('open', 'direct');
    END IF;
END
$$;


CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone CHAR(10) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Since a single user can be a user, worker and admin aswell we need to make it is possible to have many roles per person. That's why another table for roles is made here. We also use a composite primary key of account_id and role to make sure that a user can't have the same role twice. */
CREATE TABLE IF NOT EXISTS account_roles (
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, /* on delete cascade makes sure that when an account is deleted, all its roles are also deleted */
    role account_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (account_id, role)
);

/* Dedicated admin profile for platform-level governance data. */
CREATE TABLE IF NOT EXISTS admin_profiles(
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    admin_level TEXT NOT NULL DEFAULT 'standard' CHECK (admin_level IN ('standard', 'super')),
    department TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Operator profile for operations/support workflow ownership. */
CREATE TABLE IF NOT EXISTS operator_profiles(
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    queue_name TEXT,
    shift_start TIME,
    shift_end TIME,
    is_on_duty BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT operator_shift_window_chk CHECK (
        shift_start IS NULL
        OR shift_end IS NULL
        OR shift_start <> shift_end
    )
);

/* This request tag for all the direct and open requests */
CREATE TABLE IF NOT EXISTS requests(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    request_type request_type NOT NULL DEFAULT 'open',
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
    assigned_worker_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Dedicated table for direct-to-worker requests so this flow stays independent from open bidding ads. */
CREATE TABLE IF NOT EXISTS direct_request_details(
    request_id UUID PRIMARY KEY REFERENCES requests(id) ON DELETE CASCADE,
    target_worker_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    budget NUMERIC(10, 2) CHECK (budget IS NULL OR budget >= 0),
    urgency TEXT CHECK (urgency IS NULL OR urgency IN ('low', 'medium', 'high')),
    preferred_start TIMESTAMPTZ,
    preferred_end TIMESTAMPTZ,
    response_status TEXT NOT NULL DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'rejected')),
    response_note TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT direct_request_time_window_chk CHECK (
        preferred_start IS NULL
        OR preferred_end IS NULL
        OR preferred_end > preferred_start
    )
);

CREATE TABLE IF NOT EXISTS bids(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    worker_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    message TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'withdrawn', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Worker-specific profile info used during bid and rating workflows. */
CREATE TABLE IF NOT EXISTS worker_profiles(
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    ratings_count INT NOT NULL DEFAULT 0 CHECK (ratings_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* One review per request once the job is completed. */
CREATE TABLE IF NOT EXISTS reviews(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL UNIQUE REFERENCES requests(id) ON DELETE CASCADE,
    user_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    worker_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Audit trail for request status transitions. */
CREATE TABLE IF NOT EXISTS request_status_history(
    id BIGSERIAL PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    note TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS request_status_history_request_idx
ON request_status_history (request_id, changed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS bids_one_accepted_per_request_idx
ON bids (request_id)
WHERE status = 'accepted';

CREATE OR REPLACE FUNCTION enforce_open_request_for_bids()
RETURNS TRIGGER AS $$ /* from here it runs only when a bid is inserted or updated with a request_id*/ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM requests r
        WHERE r.id = NEW.request_id AND r.request_type = 'open'
    ) THEN
        RAISE EXCEPTION 'Bids are allowed only for open requests. request_id=%', NEW.request_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bids_open_requests_only ON bids;
/* Here a trigger is created that runs the enforce_open_request_for_bids function before every insert or update on the bids table. This way we make sure that no bid can be created for a direct request. */
CREATE TRIGGER trg_bids_open_requests_only
BEFORE INSERT OR UPDATE OF request_id ON bids
FOR EACH ROW
EXECUTE FUNCTION enforce_open_request_for_bids();

COMMIT;



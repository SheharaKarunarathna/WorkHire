/* ===================================================================
   WorkHire Bidding System - Database Schema
   
   This migration file contains:
   1. Core bids table (already exists in schema.sql)
   2. Recommended enhancements and indexes
   3. Audit logging for bid status transitions
   4. Constraints to ensure data integrity
   
   Apply after base schema.sql to enhance bidding functionality
   =================================================================== */

BEGIN;

-- =====================================================================
-- 1. CORE BIDS TABLE (Reference from schema.sql)
-- =====================================================================
-- Note: This table is already created in schema.sql
-- Included here for documentation purposes

/*
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
*/

-- =====================================================================
-- 2. CONSTRAINT: Prevent duplicate active bids from same worker
-- =====================================================================
-- Business Rule: A worker cannot place multiple active bids on the same request
-- This constraint allows only one active/pending bid per worker per request

CREATE UNIQUE INDEX IF NOT EXISTS bids_one_per_worker_per_request
ON bids (request_id, worker_account_id)
WHERE status IN ('active', 'accepted');

-- Note: IF NOT EXISTS safely skips creation if the index already exists

-- =====================================================================
-- 3. PERFORMANCE INDEXES
-- =====================================================================

-- Index 1: Query all bids for a specific request (most common operation)
-- Used when displaying bids on a request detail page
CREATE INDEX IF NOT EXISTS idx_bids_request_id ON bids (request_id, status);

-- Index 2: Query active bids by worker (for worker dashboard)
-- Used to show worker their current open bids
CREATE INDEX IF NOT EXISTS idx_bids_worker_active 
ON bids (worker_account_id, status) 
WHERE status = 'active';

-- Index 3: Chronological bid retrieval (bid history reporting)
-- Used for audit trails and reporting
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids (created_at DESC);

-- Index 4: Find accepted bid for a request (enforcement query)
-- Supports the unique index check and acceptance workflow
CREATE INDEX IF NOT EXISTS idx_bids_accepted_lookup 
ON bids (request_id) 
WHERE status = 'accepted';

-- =====================================================================
-- 4. AUDIT LOGGING TABLE
-- =====================================================================
-- Purpose: Track all bid status transitions for compliance and debugging
-- Each row represents a status change event

CREATE TABLE IF NOT EXISTS bid_status_history (
    id BIGSERIAL PRIMARY KEY,
    bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_bid_status_history_bid_id 
ON bid_status_history (bid_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_bid_status_history_changed_by 
ON bid_status_history (changed_by_account_id, changed_at DESC);

-- =====================================================================
-- 5. TRIGGERS FOR AUDIT LOGGING
-- =====================================================================

-- Trigger Function: Log bid status changes
CREATE OR REPLACE FUNCTION log_bid_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status <> NEW.status THEN
        INSERT INTO bid_status_history (bid_id, from_status, to_status, changed_by_account_id)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.worker_account_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bid updates
DROP TRIGGER IF EXISTS trg_log_bid_status_change ON bids;
CREATE TRIGGER trg_log_bid_status_change
AFTER UPDATE OF status ON bids
FOR EACH ROW
EXECUTE FUNCTION log_bid_status_change();

-- =====================================================================
-- 6. HELPER FUNCTION: Get bids for request with worker details
-- =====================================================================
-- Purpose: Simplify common query pattern (bids + worker info + ratings)
-- Returns all active bids for a request with worker verification/rating data

CREATE OR REPLACE FUNCTION get_request_bids_with_details(p_request_id UUID)
RETURNS TABLE (
    bid_id UUID,
    bid_amount NUMERIC,
    bid_message TEXT,
    bid_created_at TIMESTAMPTZ,
    worker_id UUID,
    worker_name TEXT,
    worker_email CITEXT,
    verification_status TEXT,
    avg_rating NUMERIC,
    ratings_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.amount,
        b.message,
        b.created_at,
        a.id,
        a.full_name,
        a.email,
        wp.verification_status,
        wp.avg_rating,
        wp.ratings_count
    FROM bids b
    JOIN accounts a ON b.worker_account_id = a.id
    JOIN worker_profiles wp ON a.id = wp.account_id
    WHERE b.request_id = p_request_id AND b.status = 'active'
    ORDER BY b.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================================
-- 7. HELPER FUNCTION: Accept bid (atomic operation)
-- =====================================================================
-- Purpose: Atomically update bid status and assign worker to request
-- Ensures consistency between bids and requests tables
-- Returns success/failure with message

CREATE OR REPLACE FUNCTION accept_bid(
    p_bid_id UUID,
    p_request_id UUID,
    p_user_account_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    assigned_worker_id UUID
) AS $$
DECLARE
    v_worker_id UUID;
    v_bid_count INT;
BEGIN
    -- Start transaction (implicit in function)
    
    -- Verify bid exists and belongs to request
    SELECT worker_account_id INTO v_worker_id
    FROM bids
    WHERE id = p_bid_id AND request_id = p_request_id AND status = 'active';
    
    IF v_worker_id IS NULL THEN
        RETURN QUERY SELECT false, 'Bid not found or already processed'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Check if request already has accepted bid
    SELECT COUNT(*) INTO v_bid_count
    FROM bids
    WHERE request_id = p_request_id AND status = 'accepted';
    
    IF v_bid_count > 0 THEN
        RETURN QUERY SELECT false, 'Request already has accepted bid'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Update all other bids to rejected
    UPDATE bids
    SET status = 'rejected', updated_at = NOW()
    WHERE request_id = p_request_id AND id <> p_bid_id AND status = 'active';
    
    -- Accept the winning bid
    UPDATE bids
    SET status = 'accepted', updated_at = NOW()
    WHERE id = p_bid_id;
    
    -- Update request with assigned worker and status
    UPDATE requests
    SET assigned_worker_account_id = v_worker_id, 
        status = 'accepted',
        updated_at = NOW()
    WHERE id = p_request_id;
    
    RETURN QUERY SELECT true, 'Bid accepted successfully'::TEXT, v_worker_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 8. HELPER FUNCTION: Withdraw bid
-- =====================================================================
-- Purpose: Allow worker to withdraw active bid before request is closed
-- Returns success/failure with message

CREATE OR REPLACE FUNCTION withdraw_bid(p_bid_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_status TEXT;
BEGIN
    -- Check if bid exists and is active
    SELECT status INTO v_status
    FROM bids
    WHERE id = p_bid_id;
    
    IF v_status IS NULL THEN
        RETURN QUERY SELECT false, 'Bid not found'::TEXT;
        RETURN;
    END IF;
    
    IF v_status <> 'active' THEN
        RETURN QUERY SELECT false, 'Only active bids can be withdrawn'::TEXT;
        RETURN;
    END IF;
    
    -- Withdraw the bid
    UPDATE bids
    SET status = 'withdrawn', updated_at = NOW()
    WHERE id = p_bid_id;
    
    RETURN QUERY SELECT true, 'Bid withdrawn successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 9. DATA VALIDATION FUNCTION
-- =====================================================================
-- Purpose: Validate bid amount before insertion
-- Ensures amount is reasonable (0.01 to 999,999.99)

CREATE OR REPLACE FUNCTION validate_bid_amount(p_amount NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_amount > 0 AND p_amount <= 99999999.99;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================================
-- COMMIT
-- =====================================================================

COMMIT;

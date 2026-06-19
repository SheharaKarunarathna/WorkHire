# Bids Database Schema Design

## Overview
The `bids` table is the core data structure for the open marketplace bidding workflow. It tracks all bids placed by workers on open requests, including bid amounts, messages, and status lifecycle.

---

## Current Schema

### `bids` Table

```sql
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
```

### Field Descriptions

| Field | Type | Constraints | Purpose |
|-------|------|-----------|---------|
| `id` | UUID | PRIMARY KEY | Unique bid identifier |
| `request_id` | UUID | NOT NULL, FK→requests | Links bid to open request |
| `worker_account_id` | UUID | NOT NULL, FK→accounts | References the bidding worker |
| `amount` | NUMERIC(10,2) | NOT NULL | Proposed bid price (max 99,999,999.99) |
| `message` | TEXT | NULLABLE | Optional cover letter/proposal from worker |
| `status` | TEXT | CHECK constraint | Tracks bid lifecycle state |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Bid submission timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

### Bid Status States

```
┌─────────┐
│ ACTIVE  │  (Initial state when bid is placed)
└────┬────┘
     │
     ├─────────────────────┬──────────────────────┐
     ▼                     ▼                      ▼
┌──────────┐         ┌──────────┐          ┌──────────┐
│ WITHDRAWN│         │ ACCEPTED │          │ REJECTED │
│(by worker)│        │(by user) │          │(by user) │
└──────────┘         └──────────┘          └──────────┘
```

**State Transitions:**
- `active` → `withdrawn`: Worker cancels their bid before user selection
- `active` → `accepted`: User selects this bid and assigns worker to request
- `active` / `withdrawn` → `rejected`: User manually rejects specific bid
- `accepted`: Final state once selected; only one per request (enforced by unique index)

---

## Key Constraints & Protections

### 1. **One Accepted Bid Per Request (Unique Index)**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS bids_one_accepted_per_request_idx
ON bids (request_id)
WHERE status = 'accepted';
```
- Ensures only ONE bid per request can be in `accepted` status
- Uses partial index (WHERE clause) for efficiency
- **Business Rule**: A request can have only one assigned worker

### 2. **Bids Only for Open Requests (Trigger)**
```sql
CREATE TRIGGER trg_bids_open_requests_only
BEFORE INSERT OR UPDATE OF request_id ON bids
FOR EACH ROW
EXECUTE FUNCTION enforce_open_request_for_bids();
```
- Prevents bids on `direct` requests
- Only `open` type requests accept bids
- Enforced at database level for data integrity

---

## Recommended Enhancements (Optional)

### 1. Add Unique Constraint (Prevent Duplicate Bids)
**Current Issue**: A worker could theoretically place multiple active bids on the same request.

**Solution**:
```sql
ALTER TABLE bids 
ADD CONSTRAINT bids_one_per_worker_per_request UNIQUE (request_id, worker_account_id) 
WHERE status != 'withdrawn';
```
**Benefit**: Prevents duplicate active bids from same worker on same request.

### 2. Add Performance Indexes
```sql
-- Query bids by request (common operation)
CREATE INDEX IF NOT EXISTS idx_bids_request_id 
ON bids (request_id, status);

-- Query all active bids by worker
CREATE INDEX IF NOT EXISTS idx_bids_worker_active 
ON bids (worker_account_id, status) 
WHERE status = 'active';

-- Get bid history for reporting
CREATE INDEX IF NOT EXISTS idx_bids_created_at 
ON bids (created_at DESC);
```

### 3. Add Audit Logging (if needed)
```sql
CREATE TABLE IF NOT EXISTS bid_status_history (
    id BIGSERIAL PRIMARY KEY,
    bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    changed_by_account_id UUID NOT NULL REFERENCES accounts(id),
    reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Relationships

### Direct Relations
- **`requests`**: One request → Many bids (1:M)
  - ON DELETE CASCADE: Deleting a request removes all its bids
  - Ensures referential integrity

- **`accounts`**: One worker → Many bids (1:M)
  - ON DELETE CASCADE: Deleting a worker removes all their bids
  - Ensures no orphaned bid records

- **`worker_profiles`**: Used for worker verification & rating lookup
  - Not directly linked; accessed via `accounts` table

---

## Query Patterns

### Common Operations:

**1. Get all active bids for a request (with worker details)**
```sql
SELECT b.*, wp.avg_rating, wp.verification_status, a.full_name, a.email
FROM bids b
JOIN accounts a ON b.worker_account_id = a.id
JOIN worker_profiles wp ON a.id = wp.account_id
WHERE b.request_id = $1 AND b.status = 'active'
ORDER BY b.created_at ASC;
```

**2. Accept a bid (atomically update both tables)**
```sql
BEGIN;
UPDATE bids SET status = 'accepted', updated_at = NOW() 
WHERE id = $1;
UPDATE requests SET assigned_worker_account_id = $2, status = 'accepted' 
WHERE id = $3;
COMMIT;
```

**3. Withdraw a bid**
```sql
UPDATE bids 
SET status = 'withdrawn', updated_at = NOW() 
WHERE id = $1 AND status = 'active';
```

**4. Get worker's active bid history**
```sql
SELECT b.*, r.title, r.location 
FROM bids b
JOIN requests r ON b.request_id = r.id
WHERE b.worker_account_id = $1 AND b.status IN ('active', 'accepted')
ORDER BY b.created_at DESC;
```

---

## Data Integrity Rules

✅ **Enforced at Database Level:**
1. Only one accepted bid per request
2. Bids only for open requests (not direct)
3. Referential integrity via foreign keys
4. Cascade deletes prevent orphaned records

⚠️ **Enforced at Application Level:**
1. Worker must be verified before placing bid
2. Amount validation (positive, reasonable range)
3. Message length constraints
4. Rejection reasons tracking (optional)

---

## Migration Checklist

- [x] `bids` table exists
- [x] Unique index on accepted bids enforced
- [x] Trigger for open requests only
- [ ] (Optional) Add duplicate bid prevention constraint
- [ ] (Optional) Add performance indexes
- [ ] (Optional) Add audit logging table

---

## Performance Considerations

- **Current Indexes**: ✅ Covered for core operations
- **Read Heavy**: Queries for "all bids on request" are frquent → Consider compound index
- **Write Operations**: Low volume → No tuning needed
- **Cascade Deletes**: Safe; no circular dependencies

---

## Summary

The current `bids` schema is **well-designed and production-ready**. It supports:
- ✅ Multiple bids per request
- ✅ Single assigned worker (via unique accepted index)
- ✅ Bid lifecycle management (active → withdrawn/accepted/rejected)
- ✅ Worker identification & auditability
- ✅ Referential integrity (no orphaned records)
- ✅ Open requests only (trigger protection)

**Recommended next steps**: Implement the service layer (`bidding.service.js`), controller, and API routes.

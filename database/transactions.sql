-- This transaction is made to make sure the placing bids is atomic and consistent. It checks if the request is still pending and if the worker is verified before allowing the bid to be placed. It also locks the request row to prevent race conditions where multiple workers try to place a bid on the same request at the same time. If multiple 
BEGIN;

WITH locked_request AS (
    SELECT id, status
  FROM requests
    WHERE id = $1
    FOR UPDATE
), worker_ok AS (
    SELECT wp.account_id
    FROM worker_profiles wp
    WHERE wp.account_id = $2
      AND wp.verification_status = 'verified'
)
INSERT INTO bids (request_id, worker_account_id, amount, message, status)
SELECT lr.id, wo.account_id, $3, $4, 'active'
FROM locked_request lr
JOIN worker_ok wo ON TRUE
WHERE lr.status = 'pending';

COMMIT;

-- 2) User accepts a bid and assigns worker atomically.
BEGIN;

SELECT id, status
FROM requests
WHERE id = $1
FOR UPDATE;

UPDATE bids
SET status = 'accepted', updated_at = NOW()
WHERE id = $2
  AND request_id = $1
  AND status = 'active';

UPDATE bids
SET status = 'rejected', updated_at = NOW()
WHERE request_id = $1
  AND id <> $2
  AND status = 'active';

UPDATE requests sr
SET assigned_worker_account_id = b.worker_account_id,
    status = 'accepted',
    updated_at = NOW()
FROM bids b
WHERE sr.id = $1
  AND b.id = $2
  AND b.status = 'accepted';

INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_account_id, note)
VALUES ($1, 'pending', 'accepted', $3, 'Bid accepted by user');

COMMIT;

-- 3) Start job (accepted -> in_progress).
BEGIN;

UPDATE requests
SET status = 'in_progress', updated_at = NOW()
WHERE id = $1
  AND assigned_worker_account_id = $2
  AND status = 'accepted';

INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_account_id, note)
VALUES ($1, 'accepted', 'in_progress', $2, 'Worker started job');

COMMIT;

-- 4) Complete job + write review + update worker aggregate rating atomically.
BEGIN;

UPDATE requests
SET status = 'completed', updated_at = NOW()
WHERE id = $1
  AND status = 'in_progress';

INSERT INTO reviews (request_id, user_account_id, worker_account_id, rating, review_text)
VALUES ($1, $2, $3, $4, $5);

UPDATE worker_profiles
SET avg_rating = ROUND(((avg_rating * ratings_count) + $4)::numeric / (ratings_count + 1), 2),
    ratings_count = ratings_count + 1,
    updated_at = NOW()
WHERE account_id = $3;

INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_account_id, note)
VALUES ($1, 'in_progress', 'completed', $2, 'Job completed and reviewed');

COMMIT;



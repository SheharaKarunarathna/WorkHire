/* ===================================================================
   WorkHire Auth - Refresh Tokens Migration

   Creates the refresh_tokens table for storing long-lived tokens.
   Apply this after schema.sql.
   =================================================================== */

BEGIN;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,           -- SHA-256 hash of the actual token (never store raw)
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: look up tokens by account (for logout-all / list sessions)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_account_id
ON refresh_tokens (account_id);

-- Index: clean up expired/revoked tokens efficiently
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
ON refresh_tokens (expires_at)
WHERE revoked = FALSE;

COMMIT;

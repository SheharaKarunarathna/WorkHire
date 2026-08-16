/* ===================================================================
   WorkHire Chat - Chat Messages Table Migration
   
   Creates the chat_messages table for persisting real-time job chat.
   =================================================================== */

BEGIN;

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    sender_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for retrieving chat history in chronological order per request
CREATE INDEX IF NOT EXISTS idx_chat_messages_request_id_created_at
ON chat_messages (request_id, created_at ASC);

COMMIT;

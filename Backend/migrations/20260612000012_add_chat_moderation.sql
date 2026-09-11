-- +goose Up

-- Add warning_count to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS warning_count INT NOT NULL DEFAULT 0;

-- Flagged messages table: stores messages that triggered the content filter
CREATE TABLE IF NOT EXISTS flagged_messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id       UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    sender_user_id   UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    conversation_id  UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    trigger_word     VARCHAR(200) NOT NULL,
    body_snapshot    TEXT        NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'warned', 'dismissed')),
    reviewed_by      UUID        REFERENCES admins(id) ON DELETE SET NULL,
    reviewed_at      TIMESTAMP,
    created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flagged_messages_status         ON flagged_messages (status);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_sender         ON flagged_messages (sender_user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_conversation   ON flagged_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_created_at     ON flagged_messages (created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS flagged_messages;
ALTER TABLE users DROP COLUMN IF EXISTS warning_count;
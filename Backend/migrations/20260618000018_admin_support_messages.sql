-- +goose Up
-- Allow admins to send support messages without a user account.
-- Makes sender_user_id nullable and adds sender_admin_id.
-- Exactly one of the two must be non-null (enforced by CHECK).

ALTER TABLE messages ALTER COLUMN sender_user_id DROP NOT NULL;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS sender_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL;

ALTER TABLE messages
    ADD CONSTRAINT chk_message_sender CHECK (
        (sender_user_id IS NOT NULL AND sender_admin_id IS NULL) OR
        (sender_user_id IS NULL     AND sender_admin_id IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS idx_messages_sender_admin_id ON messages(sender_admin_id)
    WHERE sender_admin_id IS NOT NULL;

-- +goose Down
ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_message_sender;
DROP INDEX IF EXISTS idx_messages_sender_admin_id;
ALTER TABLE messages DROP COLUMN IF EXISTS sender_admin_id;
ALTER TABLE messages ALTER COLUMN sender_user_id SET NOT NULL;

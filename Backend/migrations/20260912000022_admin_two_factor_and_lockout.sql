-- +goose Up
-- Two-factor authentication (TOTP, RFC 6238) for portal admins.
--   totp_secret         base32 secret; NULL = not enrolled
--   totp_confirmed_at   set once the admin has entered a valid code during
--                       setup; an unconfirmed secret is never accepted
--   totp_last_used_step last accepted 30-second step, to reject code replay
ALTER TABLE admins
    ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64),
    ADD COLUMN IF NOT EXISTS totp_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS totp_last_used_step BIGINT NOT NULL DEFAULT 0;

-- Login throttling (django-axes style). One row per subject — "ip:<addr>"
-- or "email:<address>" — shared by every portal replica.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    subject VARCHAR(320) PRIMARY KEY,
    failures INT NOT NULL DEFAULT 0,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_login_attempts_updated_at ON admin_login_attempts(updated_at);

-- +goose Down
DROP TABLE IF EXISTS admin_login_attempts;
ALTER TABLE admins
    DROP COLUMN IF EXISTS totp_last_used_step,
    DROP COLUMN IF EXISTS totp_confirmed_at,
    DROP COLUMN IF EXISTS totp_secret;

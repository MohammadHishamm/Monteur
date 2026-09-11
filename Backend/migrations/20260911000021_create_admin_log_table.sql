-- +goose Up
-- Audit trail of everything done through the admin portal — the equivalent
-- of Django's django_admin_log. Powers the "Recent actions" panel and gives
-- a paper trail for manual data fixes.
CREATE TABLE IF NOT EXISTS admin_log (
    id BIGSERIAL PRIMARY KEY,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    admin_email VARCHAR(255) NOT NULL,
    -- 1 = addition, 2 = change, 3 = deletion (Django's ADDITION/CHANGE/DELETION)
    action_flag SMALLINT NOT NULL CHECK (action_flag IN (1, 2, 3)),
    app_label VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    object_id TEXT NOT NULL,
    object_repr VARCHAR(255) NOT NULL,
    change_message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_log_created_at ON admin_log(created_at DESC);
CREATE INDEX idx_admin_log_admin_id ON admin_log(admin_id);
CREATE INDEX idx_admin_log_model_object ON admin_log(app_label, model, object_id);

-- +goose Down
DROP TABLE IF EXISTS admin_log;

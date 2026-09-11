-- +goose Up
-- saved_freelancers: clients bookmark freelancer profiles
CREATE TABLE IF NOT EXISTS saved_freelancers (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, freelancer_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_freelancers_user ON saved_freelancers(user_id);

-- +goose Down
DROP TABLE IF EXISTS saved_freelancers;

-- +goose Up
-- Country shown alongside city on freelancer cards/profiles. Sent at onboarding
-- but previously had nowhere to land.
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS country;

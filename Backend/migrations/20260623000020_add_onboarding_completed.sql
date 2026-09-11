-- +goose Up
-- Explicit onboarding-completion flag. Previously completion was inferred from
-- content fields (freelancer.tagline / client.company_name), which caused clients
-- to loop forever on the final onboarding step because company_name was never set.
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Backfill existing users that already look onboarded so they aren't bounced back
-- into onboarding after this migration.
UPDATE users
SET onboarding_completed = true
WHERE (user_type = 'freelancer' AND COALESCE(tagline, '') <> '')
   OR (user_type = 'client'     AND COALESCE(company_name, '') <> '');

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed;

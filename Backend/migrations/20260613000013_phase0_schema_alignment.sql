-- +goose Up
-- Phase 0: Align DB schema with frontend type contracts
-- Adds video-specific categories, aspect ratios, and freelancer profile fields
-- that the frontend mock data uses but were missing from the initial schema.

-- ─── 1. jobs table ───────────────────────────────────────────────────────────

-- Extend category to include video-editing-specific values.
-- Drop the old CHECK constraint and add a new one.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_category_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_category_check
    CHECK (category IN (
        'development', 'design', 'writing', 'marketing', 'video', 'data',
        'reels', 'youtube', 'motion', 'ads', 'weddings', 'podcast', 'vfx', 'color'
    ));

-- Video aspect ratio (used in job cards for thumbnail preview).
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS aspect VARCHAR(10) DEFAULT NULL
    CHECK (aspect IS NULL OR aspect IN ('9:16', '16:9', '1:1', '4:5', '1:1.91'));

-- ─── 2. projects table ───────────────────────────────────────────────────────

-- Same category extension for the projects table.
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_category_check;
ALTER TABLE projects ADD CONSTRAINT projects_category_check
    CHECK (category IN (
        'development', 'design', 'writing', 'marketing', 'video', 'data',
        'reels', 'youtube', 'motion', 'ads', 'weddings', 'podcast', 'vfx', 'color'
    ));

-- ─── 3. freelancer_showcases table ───────────────────────────────────────────

-- Same category extension for showcase case studies.
ALTER TABLE freelancer_showcases DROP CONSTRAINT IF EXISTS freelancer_showcases_category_check;
ALTER TABLE freelancer_showcases ADD CONSTRAINT freelancer_showcases_category_check
    CHECK (category IN (
        'development', 'design', 'writing', 'marketing', 'video', 'data',
        'reels', 'youtube', 'motion', 'ads', 'weddings', 'podcast', 'vfx', 'color'
    ));

-- ─── 4. users table — freelancer profile fields ───────────────────────────────

-- Tier badge earned by reputation (bronze → platinum).
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'bronze'
    CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- One-line headline shown under the freelancer's name.
ALTER TABLE users ADD COLUMN IF NOT EXISTS tagline VARCHAR(255) DEFAULT '';

-- City (freelancers show city + country on their cards).
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT '';

-- On-time delivery rate shown on freelancer profiles (0–100 percent).
ALTER TABLE users ADD COLUMN IF NOT EXISTS on_time_rate INT DEFAULT 0
    CHECK (on_time_rate >= 0 AND on_time_rate <= 100);

-- Typical response time label, e.g. "خلال ساعة" (displayed as-is).
ALTER TABLE users ADD COLUMN IF NOT EXISTS response_time VARCHAR(100) DEFAULT '';

-- Count of successfully completed jobs (shown on profile cards).
ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_jobs INT DEFAULT 0
    CHECK (completed_jobs >= 0);

-- Profile completion percentage (0–100), used in freelancer dashboard checklist.
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completion INT DEFAULT 0
    CHECK (profile_completion >= 0 AND profile_completion <= 100);

-- Languages spoken, stored as JSONB array: [{"name":"العربية","level":"native"}, ...]
ALTER TABLE users ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]';

-- ─── 5. Indexes on new columns ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_tier
    ON users(tier) WHERE user_type = 'freelancer';

CREATE INDEX IF NOT EXISTS idx_users_city
    ON users(city) WHERE user_type = 'freelancer';

CREATE INDEX IF NOT EXISTS idx_users_completed_jobs
    ON users(completed_jobs DESC) WHERE user_type = 'freelancer';

CREATE INDEX IF NOT EXISTS idx_jobs_aspect
    ON jobs(aspect) WHERE aspect IS NOT NULL;

-- +goose Down
-- Reverse all changes in the opposite order.

DROP INDEX IF EXISTS idx_jobs_aspect;
DROP INDEX IF EXISTS idx_users_completed_jobs;
DROP INDEX IF EXISTS idx_users_city;
DROP INDEX IF EXISTS idx_users_tier;

ALTER TABLE users DROP COLUMN IF EXISTS languages;
ALTER TABLE users DROP COLUMN IF EXISTS profile_completion;
ALTER TABLE users DROP COLUMN IF EXISTS completed_jobs;
ALTER TABLE users DROP COLUMN IF EXISTS response_time;
ALTER TABLE users DROP COLUMN IF EXISTS on_time_rate;
ALTER TABLE users DROP COLUMN IF EXISTS city;
ALTER TABLE users DROP COLUMN IF EXISTS tagline;
ALTER TABLE users DROP COLUMN IF EXISTS tier;

ALTER TABLE jobs DROP COLUMN IF EXISTS aspect;

ALTER TABLE freelancer_showcases DROP CONSTRAINT IF EXISTS freelancer_showcases_category_check;
ALTER TABLE freelancer_showcases ADD CONSTRAINT freelancer_showcases_category_check
    CHECK (category IN ('development', 'design', 'writing', 'marketing', 'video', 'data'));

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_category_check;
ALTER TABLE projects ADD CONSTRAINT projects_category_check
    CHECK (category IN ('development', 'design', 'writing', 'marketing', 'video', 'data'));

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_category_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_category_check
    CHECK (category IN ('development', 'design', 'writing', 'marketing', 'video', 'data'));

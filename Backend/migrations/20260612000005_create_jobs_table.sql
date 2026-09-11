-- +goose Up
-- Create jobs table for client job postings
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('development', 'design', 'writing', 'marketing', 'video', 'data')),
    skills TEXT[] NOT NULL DEFAULT '{}',
    budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('fixed', 'hourly')),
    budget_min DECIMAL(12, 2) NOT NULL DEFAULT 0,
    budget_max DECIMAL(12, 2) NOT NULL DEFAULT 0,
    duration_label VARCHAR(100) NOT NULL DEFAULT '',
    experience_tier VARCHAR(20) NOT NULL DEFAULT 'any' CHECK (experience_tier IN ('any', 'bronze', 'silver', 'gold', 'platinum')),
    deliverables TEXT[] NOT NULL DEFAULT '{}',
    urgent BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
    proposals_count INT NOT NULL DEFAULT 0,
    hired_freelancer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    posted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_experience_tier ON jobs(experience_tier);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_open_recent ON jobs(status, posted_at DESC) WHERE status = 'open';
CREATE INDEX idx_jobs_skills ON jobs USING GIN(skills);

-- +goose Down
DROP TABLE IF EXISTS jobs;
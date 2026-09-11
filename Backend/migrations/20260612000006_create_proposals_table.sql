-- +goose Up
-- Create proposals table for freelancer offers on jobs
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT NOT NULL,
    bid_amount DECIMAL(12, 2) NOT NULL,
    budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('fixed', 'hourly')),
    delivery_time_label VARCHAR(100) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'shortlisted', 'accepted', 'declined', 'withdrawn')),
    client_message TEXT NOT NULL DEFAULT '',
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    viewed_at TIMESTAMP,
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_proposals_job_freelancer UNIQUE (job_id, freelancer_id)
);

CREATE INDEX idx_proposals_job_id ON proposals(job_id);
CREATE INDEX idx_proposals_freelancer_id ON proposals(freelancer_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_submitted_at ON proposals(submitted_at DESC);
CREATE INDEX idx_proposals_job_status ON proposals(job_id, status, submitted_at DESC);

-- +goose Down
DROP TABLE IF EXISTS proposals;
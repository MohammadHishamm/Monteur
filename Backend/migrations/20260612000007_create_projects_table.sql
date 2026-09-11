-- +goose Up
-- Create projects table for accepted jobs / active contracts
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('development', 'design', 'writing', 'marketing', 'video', 'data')),
    budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('fixed', 'hourly')),
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    escrow_funded BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'disputed')),
    due_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_freelancer_id ON projects(freelancer_id);
CREATE INDEX idx_projects_job_id ON projects(job_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_due_at ON projects(due_at);

-- +goose Down
DROP TABLE IF EXISTS projects;
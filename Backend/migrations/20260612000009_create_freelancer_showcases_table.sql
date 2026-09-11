-- +goose Up
-- Create freelancer showcases / portfolio case studies
CREATE TABLE IF NOT EXISTS freelancer_showcases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    category VARCHAR(50) NOT NULL CHECK (category IN ('development', 'design', 'writing', 'marketing', 'video', 'data')),
    year_label VARCHAR(20) NOT NULL DEFAULT '',
    duration_label VARCHAR(100) NOT NULL DEFAULT '',
    role_label VARCHAR(255) NOT NULL DEFAULT '',
    client_name VARCHAR(255) NOT NULL DEFAULT '',
    industry VARCHAR(100) NOT NULL DEFAULT '',
    live_url TEXT,
    cover_url TEXT,
    description TEXT NOT NULL DEFAULT '',
    challenge TEXT NOT NULL DEFAULT '',
    approach TEXT NOT NULL DEFAULT '',
    outcome TEXT NOT NULL DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT '{}',
    deliverables TEXT[] NOT NULL DEFAULT '{}',
    metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_freelancer_showcases_freelancer_id ON freelancer_showcases(freelancer_id);
CREATE INDEX idx_freelancer_showcases_category ON freelancer_showcases(category);
CREATE INDEX idx_freelancer_showcases_featured ON freelancer_showcases(is_featured, display_order);
CREATE INDEX idx_freelancer_showcases_tags ON freelancer_showcases USING GIN(tags);

-- +goose Down
DROP TABLE IF EXISTS freelancer_showcases;
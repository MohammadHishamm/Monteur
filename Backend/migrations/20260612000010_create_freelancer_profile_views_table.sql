-- +goose Up
-- Track freelancer profile views with IP-based deduplication
CREATE TABLE IF NOT EXISTS freelancer_profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewer_ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    referrer TEXT NOT NULL DEFAULT '',
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    view_date DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT uq_freelancer_profile_views_daily UNIQUE (freelancer_id, viewer_ip_address, view_date)
);

CREATE INDEX idx_freelancer_profile_views_freelancer_id ON freelancer_profile_views(freelancer_id);
CREATE INDEX idx_freelancer_profile_views_viewed_at ON freelancer_profile_views(viewed_at DESC);
CREATE INDEX idx_freelancer_profile_views_viewer_ip_address ON freelancer_profile_views(viewer_ip_address);

-- +goose Down
DROP TABLE IF EXISTS freelancer_profile_views;
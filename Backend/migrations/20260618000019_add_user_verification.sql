-- +goose Up
ALTER TABLE users ADD COLUMN verification_status VARCHAR(50) DEFAULT 'unverified';

CREATE TABLE user_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id_front_url TEXT NOT NULL,
    id_back_url TEXT NOT NULL,
    selfie_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
DROP TABLE IF EXISTS user_verifications;
ALTER TABLE users DROP COLUMN IF EXISTS verification_status;

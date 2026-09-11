-- +goose Up
-- Create user_balances table for wallet tracking per user
CREATE TABLE IF NOT EXISTS user_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    available_balance DECIMAL(14, 2) NOT NULL DEFAULT 0,
    pending_balance DECIMAL(14, 2) NOT NULL DEFAULT 0,
    lifetime_earned DECIMAL(14, 2) NOT NULL DEFAULT 0,
    lifetime_spent DECIMAL(14, 2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_balances_user_id UNIQUE (user_id),
    CONSTRAINT chk_user_balances_available_non_negative CHECK (available_balance >= 0),
    CONSTRAINT chk_user_balances_pending_non_negative CHECK (pending_balance >= 0),
    CONSTRAINT chk_user_balances_lifetime_earned_non_negative CHECK (lifetime_earned >= 0),
    CONSTRAINT chk_user_balances_lifetime_spent_non_negative CHECK (lifetime_spent >= 0)
);

CREATE INDEX idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX idx_user_balances_currency ON user_balances(currency);

-- +goose Down
DROP TABLE IF EXISTS user_balances;
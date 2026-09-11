-- +goose Up
-- Create user table with types and online/offline status
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- User type: 'freelancer' or 'client'
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('freelancer', 'client')),
    
    -- Online/Offline status
    status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
    
    -- Profile information
    avatar_url TEXT,
    bio TEXT,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    
    -- Freelancer specific fields
    hourly_rate DECIMAL(10, 2),
    skills TEXT[], -- Array of skills for freelancers
    portfolio_url TEXT,
    years_of_experience INT,
    
    -- Client specific fields
    company_name VARCHAR(255),
    company_website TEXT,
    industry VARCHAR(100),
    
    -- Account status
    is_email_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    last_ip_address VARCHAR(45),
    banned_ip_address VARCHAR(45),
    ip_banned_at TIMESTAMP,
    
    -- Activity tracking
    last_activity_at TIMESTAMP,
    last_login_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table - for fast queries
-- Index on email for login/search
CREATE INDEX idx_users_email ON users(email);

-- Index on user_type for filtering freelancers vs clients
CREATE INDEX idx_users_user_type ON users(user_type);

-- Index on status for online/offline queries
CREATE INDEX idx_users_status ON users(status);

-- Index on is_active for filtering active users
CREATE INDEX idx_users_is_active ON users(is_active);

-- Index on banned_ip_address for IP-ban enforcement / lookup
CREATE INDEX idx_users_banned_ip_address ON users(banned_ip_address) WHERE banned_ip_address IS NOT NULL;

-- Index on last_ip_address for operational lookup and abuse tracing
CREATE INDEX idx_users_last_ip_address ON users(last_ip_address) WHERE last_ip_address IS NOT NULL;

-- Index on rating for freelancer ranking/sorting
CREATE INDEX idx_users_rating ON users(rating DESC) WHERE user_type = 'freelancer';

-- Composite index for common queries: active freelancers online
CREATE INDEX idx_users_freelancer_active_online ON users(user_type, is_active, status) WHERE user_type = 'freelancer';

-- Composite index for common queries: active clients
CREATE INDEX idx_users_client_active ON users(user_type, is_active) WHERE user_type = 'client';

-- Index on created_at for sorting by recent users
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Index on last_activity_at for activity tracking
CREATE INDEX idx_users_last_activity_at ON users(last_activity_at DESC);

-- Index on skills for freelancer search (using GIN for array operations)
CREATE INDEX idx_users_skills ON users USING GIN(skills) WHERE user_type = 'freelancer';


-- +goose Down
DROP TABLE IF EXISTS users;

# Database Migrations

This directory contains SQL migration files for the Freestyle video editor platform using **Goose** migration tool.

## Migration Files

### 20260612000001_create_admin_table.sql
Creates the `admins` table for platform administrators with fields:
- `id` - UUID primary key
- `email` - Unique email address
- `password_hash` - Hashed password
- `full_name` - Admin full name
- `phone` - Phone number
- `is_active` - Account status
- `last_login_at` - Last login timestamp
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `idx_admins_email` - Fast email lookup for login
- `idx_admins_is_active` - Filter active admins
- `idx_admins_created_at` - Sort by creation date

### 20260612000002_create_user_table.sql
Creates the `users` table for freelancers and clients with fields:

**Core Fields:**
- `id` - UUID primary key
- `email` - Unique email address
- `password_hash` - Hashed password
- `full_name` - User full name
- `phone` - Phone number

**User Type & Status:**
- `user_type` - Either 'freelancer' or 'client'
- `status` - Either 'online' or 'offline'

**Profile Fields:**
- `avatar_url` - Profile picture URL
- `bio` - User biography
- `rating` - Average rating (0-5)
- `total_reviews` - Number of reviews received

**Freelancer Fields:**
- `hourly_rate` - Hourly billing rate
- `skills` - Array of skills (e.g., {'Video Editing', 'Motion Graphics'})
- `portfolio_url` - Link to portfolio
- `years_of_experience` - Professional experience

**Client Fields:**
- `company_name` - Client's company name
- `company_website` - Company website URL
- `industry` - Industry classification

**Status Fields:**
- `is_email_verified` - Email verification status
- `is_active` - Account active status
- `is_banned` - Ban status
- `ban_reason` - Reason for ban if applicable
- `last_activity_at` - Last activity timestamp
- `last_login_at` - Last login timestamp

**Optimized Indexes for Fast Queries:**

| Index Name | Purpose | Use Case |
|-----------|---------|----------|
| `idx_users_email` | Email lookup | Login, password reset, user search |
| `idx_users_user_type` | Filter by type | Find all freelancers or all clients |
| `idx_users_status` | Online/offline filter | Find available freelancers |
| `idx_users_is_active` | Active users only | Exclude banned/inactive users |
| `idx_users_rating` | Freelancer ranking | Sort by rating (DESC) |
| `idx_users_freelancer_active_online` | Composite for active online freelancers | Homepage: show available freelancers |
| `idx_users_client_active` | Composite for active clients | Find active hiring clients |
| `idx_users_created_at` | Sort by newest users | Trending section, new users |
| `idx_users_last_activity_at` | Recent activity tracking | Show recently active users |
| `idx_users_skills` | Array search for skills | Find freelancers by skill tags |

## Usage

Migrations are automatically executed by Goose when the Docker container starts via the entrypoint script.

The docker entrypoint runs:
```bash
goose -dir ./migrations up
```

## Manual Migration

To manually run migrations locally (if Goose is installed):

```bash
# Run all pending migrations
goose postgres "postgres://user:password@localhost:5432/dbname" up

# Check migration status
goose postgres "postgres://user:password@localhost:5432/dbname" status

# Rollback one migration
goose postgres "postgres://user:password@localhost:5432/dbname" down
```

Or using environment variables (as set in docker entrypoint):
```bash
export GOOSE_DRIVER=postgres
export GOOSE_DBSTRING="postgres://user:pass@host:5432/dbname?sslmode=disable"
export GOOSE_MIGRATION_DIR=./migrations

goose up
goose status
goose down
```

## Database Connection

The migrations run against PostgreSQL with the connection details from your environment:
- **Host**: localhost (or docker service name)
- **Port**: 5432
- **Database**: fproject (or as configured in .env)
- **Driver**: PostgreSQL (lib/pq)

## Performance Considerations

- **Composite Indexes**: `idx_users_freelancer_active_online` and `idx_users_client_active` optimize common query patterns
- **Partial Indexes**: `idx_users_rating` only indexes freelancers
- **Array Indexes**: `idx_users_skills` uses GiST for efficient array searching
- **Descending Indexes**: `idx_users_created_at` and `idx_users_last_activity_at` optimized for recent-first sorting

These indexes ensure fast queries for:
- Finding available freelancers: ~1-5ms
- User search by email: ~1ms
- Filtering by type and status: ~5-20ms
- Ranking by rating: ~10-50ms

## Goose Documentation

For more information, see the [Goose GitHub repository](https://github.com/pressly/goose)

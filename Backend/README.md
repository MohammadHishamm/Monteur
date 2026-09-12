# FProject Backend

A high-performance Go backend API for the FProject platform, built with chi/v5, PostgreSQL, and Redis.

## Prerequisites

- **Go**: 1.21+ (download from [golang.org](https://golang.org/dl/))
- **Docker & Docker Compose**: Latest versions (download from [docker.com](https://www.docker.com/products/docker-desktop))
- **k6** (optional, for load testing): Available at `C:\Program Files\k6\k6.exe` or [download](https://k6.io/docs/get-started/installation/)

## Quick Start

### 1. Start Docker Infrastructure

The backend requires PostgreSQL 16.3 and Redis 7.2. Start them with Docker Compose:

```bash
cd Backend
docker compose -f docker/docker-compose.infra.yaml up -d
```

This starts two containers:
- **fproject-postgres-db-v2**: PostgreSQL on port 5432
- **fproject-redis-db-v2**: Redis on port 6379

**Verify containers are healthy:**
```bash
docker ps
```

Look for `STATUS` showing `Up` and `healthy`. It may take 30 seconds for health checks to pass.

### 2. Start the Backend Server

```bash
cd Backend
go run ./cmd/api
```

**Expected output:**
```
Starting API server on :8000
...
Connected to PostgreSQL
Connected to Redis
```

The server listens on `http://localhost:8000` with the primary endpoints:
- `GET /ping` - Server health check
- `POST /v1/auth/email/signup` - User registration
- `POST /v1/auth/email/signin` - User sign-in (sets HttpOnly session cookie + returns JWT)
- `POST /v1/auth/signout` - User sign-out (clears session & auth cookies)
- `GET /v1/auth/session` - Current session status
- `GET /v1/ws/notifications` - Real-time WebSocket notifications & messaging

> 📘 **Full Architecture & API Documentation**: See [BACKEND_DOCUMENTATION.md](./BACKEND_DOCUMENTATION.md) for full architectural specs, cookie security rules, WebSocket integration guides, and complete API endpoint directories.

### 3. Start the Admin Portal (optional)

A Django-admin-style UI over the database runs as a separate binary on port 8001:

```bash
go run ./cmd/admin
```

Open `http://localhost:8001/admin/` and sign in with `admin@monteur.com` / `test1234`
(created automatically on first start). See [`admin/README.md`](admin/README.md).

### 4. Test the Backend

**Quick connectivity test:**
```bash
curl http://localhost:8000/ping
```

Expected response: `{"status":"ok"}`

**Health check with database status:**
```bash
curl http://localhost:8000/v1/health
```

## Configuration

All configuration is managed via environment variables in `docker/.env`:

```bash
ENV=development                    # Environment: development or production
ADDR=:8000                        # Server listen address

# PostgreSQL credentials
DB_USER=fproject_user_v2
DB_PASSWORD=fproject_pass_v2
DB_NAME=fproject_db_v2
DB_ADDR=postgres://...@127.0.0.1:5432/fproject_db_v2?sslmode=disable

# Redis credentials
REDIS_PASSWORD=fproject_redis_pass_v2
REDIS_ADDR=localhost:6379
REDIS_DB=0
```

**Important:** The `DB_ADDR` uses `127.0.0.1` (not `localhost`) so the local backend process can connect to the Dockerized database.

## Common Tasks

### Restart Docker Infrastructure (Fresh Database)

```bash
# Stop and remove old containers + volumes
docker compose -f docker/docker-compose.infra.yaml down -v

# Start fresh
docker compose -f docker/docker-compose.infra.yaml up -d
```

### View Docker Container Logs

**PostgreSQL:**
```bash
docker logs fproject-postgres-db-v2 -f
```

**Redis:**
```bash
docker logs fproject-redis-db-v2 -f
```

### Stop All Services

```bash
docker compose -f docker/docker-compose.infra.yaml down
```

Containers are stopped but volumes persist (database data is not deleted). Use `down -v` to also remove volumes.

## Performance Testing

Load test the backend with k6:

```bash
# Quick 3-stage test to 100 concurrent users
"C:\Program Files\k6\k6.exe" run loadtest-ping.js

# Full 5-stage test ramping to 300 concurrent users
"C:\Program Files\k6\k6.exe" run loadtest.js
```

Both tests measure:
- **Requests/second**: Throughput capacity
- **Response times**: p50 (median), p95, p99 latency
- **Error rate**: Failed requests percentage

## Troubleshooting

### "connection failed: connection to server at 127.0.0.1, port 5432 failed: FATAL: password authentication failed"

**Cause:** Docker container initialized with different credentials before `.env` was updated.

**Solution:**
```bash
# Reset the database
docker compose -f docker/docker-compose.infra.yaml down -v
docker compose -f docker/docker-compose.infra.yaml up -d

# Wait 30 seconds for health checks to pass, then restart backend
go run ./cmd/api
```

### "failed to resolve host 'localhost'" when connecting to Redis

**Cause:** Using container hostname instead of IP address from outside Docker.

**Solution:** Already fixed in `.env` — ensure `REDIS_ADDR=localhost:6379` if running backend in Docker, or `REDIS_ADDR=127.0.0.1:6379` if running locally.

### Backend fails to start with "port already in use"

```bash
# Kill the process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

Then restart: `go run ./cmd/api`

### Docker containers not starting

```bash
# Check for errors
docker compose -f docker/docker-compose.infra.yaml logs

# Restart with diagnostics
docker compose -f docker/docker-compose.infra.yaml up
```

## Project Structure

```
Backend/
├── cmd/api/              # API entry point
│   ├── main.go
│   └── api.go
├── cmd/admin/            # Admin portal entry point (port 8001)
├── admin/                # Django-admin-style portal (see admin/README.md)
├── internal/
│   ├── config/           # Configuration management
│   ├── handler/          # HTTP handlers
│   ├── service/          # Business logic
│   ├── store/            # Data access layer
│   ├── cache/            # Redis cache abstraction
│   ├── ratelimiter/      # Rate limiting middleware
│   ├── realtime/         # WebSocket Hub & real-time messaging
│   ├── entity/           # Domain models
│   └── apperror/         # Error handling
├── common/               # Shared utilities
├── migrations/           # Database migrations
├── docker/
│   ├── docker-compose.infra.yaml  # Infrastructure services
│   └── .env                        # Environment configuration
├── loadtest.js           # Full k6 load test (0-300 VUs)
├── loadtest-ping.js      # Quick k6 load test (0-100 VUs)
├── go.mod                # Go module definition
└── README.md
```

## Development Workflow

1. **Start infrastructure once**: `docker compose -f docker/docker-compose.infra.yaml up -d`
2. **Run backend during development**: `go run ./cmd/api` (hot-reload friendly)
3. **Build for production**: `go build -o api ./cmd/api`
4. **Test endpoints**: Use `curl`, Postman, or the load test scripts
5. **Reset database**: `docker compose -f docker/docker-compose.infra.yaml down -v && docker compose -f docker/docker-compose.infra.yaml up -d`

## Performance Tuning

The backend is tuned for production readiness with the following defaults:

| Setting | Value | Purpose |
|---------|-------|---------|
| Database Max Open Connections | 200 | Connection pool size |
| Database Max Idle Connections | 50 | Idle connections to keep |
| Database Max Idle Time | 15m | How long idle connections persist |
| Rate Limiter Requests | 1800/30s | 60 req/s per IP |
| Rate Limiter Buckets | 64 | Sliding window resolution |

Adjust these in `internal/config/config.go` based on your performance testing results.

## Next Steps

- Implement database schema and migrations in `migrations/`
- Build out handler logic in `internal/handler/`
- Add real business logic to `internal/service/`
- Implement data models in `internal/entity/`
- Write unit tests for critical paths
- Deploy with `docker build` + production compose file

## Support

For issues or questions, check the troubleshooting section above or review the backend code comments in `cmd/api/api.go` and `internal/config/config.go`.

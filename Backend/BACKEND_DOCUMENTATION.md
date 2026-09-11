# Ariatoon Platform — Backend Architecture & Technical Documentation

This document provides a comprehensive technical reference for the Go backend service of the **Ariatoon** freelance and service platform.

---

## 1. System Overview & Technology Stack

The backend is built in **Go (Golang 1.25+)** following a modular, clean layered architecture designed for high throughput, low latency, and robust security.

### Core Stack
- **Language**: Go 1.25+
- **HTTP Routing & Middleware**: [Chi v5](https://github.com/go-chi/chi) (`github.com/go-chi/chi/v5`)
- **Database**: PostgreSQL 16.3 via `database/sql` and `github.com/lib/pq`
- **Cache & Key-Value Storage**: Redis 7.2 via `github.com/redis/go-redis/v9`
- **Session Store**: Redis Session Store (`github.com/boj/redistore`) with Gorilla Sessions (`github.com/gorilla/sessions`)
- **WebSockets**: Gorilla WebSocket (`github.com/gorilla/websocket`)
- **JWT & Cryptography**: `github.com/golang-jwt/jwt/v5` and `golang.org/x/crypto/bcrypt`
- **OAuth Providers**: Goth (`github.com/markbates/goth`) supporting Google, Discord, and GitHub
- **Validation**: Go Playground Validator v10 (`github.com/go-playground/validator/v10`)

---

## 2. Architectural Blueprint

The backend strictly separates concerns across isolated layers:

```
Backend/
├── cmd/
│   └── api/
│       ├── main.go               # Application bootstrapper & dependency wiring
│       └── api.go                # HTTP server configuration, lifecycle & graceful shutdown
├── common/                       # Shared platform primitives (crypto, JWT, mailer, envelopes)
├── internal/
│   ├── apperror/                 # Domain-specific sentinel errors
│   ├── cache/                    # Redis caching operations
│   ├── config/                   # Environment options, DB/Redis/Session factory
│   ├── entity/                   # Core business domain models & DTOs
│   ├── gatekeeper/               # HMAC API security layer
│   ├── handler/                  # HTTP controllers, WebSockets, and route registration
│   ├── ratelimiter/              # Sliding window token bucket rate limiter
│   ├── realtime/                 # WebSocket Hub, Client pumps, upgrader & outbound envelopes
│   ├── service/                  # Business logic & authentication workflows
│   ├── store/                    # PostgreSQL repository data access layer
│   └── worker/                   # Asynchronous background tasks & cron schedulers
├── migrations/                   # SQL migration files
└── docker/                       # Docker compose manifests & container scripts
```

### Layer Responsibilities
1. **Transport Layer (`internal/handler`)**: Parses HTTP requests, extracts parameters, validates input DTOs, executes middlewares, and renders structured JSON responses (`common.DataEnvelope` or `common.ErrorEnvelope`).
2. **Service Layer (`internal/service`)**: Implements business transactions, orchestrates stores, hashes passwords, generates tokens, and executes validation logic.
3. **Data Access Layer (`internal/store`)**: Executes raw, optimized SQL queries against PostgreSQL using connection pooling and transactions.
4. **Caching & Session Layer (`internal/cache`, `internal/config`)**: Redis-backed cache for high-frequency entities and Redis session store for user session states.

---

## 3. Authentication & Session Security

The backend employs a **Dual-Mode Authentication Architecture** that seamlessly supports web clients and mobile/external API clients without compromising security.

### 3.1 Web Client Session Authentication (HttpOnly Cookies)
- Web browsers authenticate via an **encrypted, HttpOnly session cookie** (`_ariatoon_ck_`).
- Session state is persisted server-side in **Redis** via `redistore`.
- The cookie contains only the cryptographically signed session ID; no sensitive credentials or user data are stored on the client.

#### Cookie Security Specification (RFC 6265 Compliant)
| Attribute | Development / Localhost | Production | Security Justification |
|:---|:---|:---|:---|
| **HttpOnly** | `true` | `true` | Prevents cookie theft via Cross-Site Scripting (XSS). |
| **Secure** | `false` (HTTP) / `true` (HTTPS) | `true` (HTTPS) | Ensures cookies are only transmitted over TLS. |
| **SameSite** | `Lax` | `Lax` | Defends against Cross-Site Request Forgery (CSRF). |
| **Domain** | `""` (host-only) | `.example.com` / `""` | RFC 6265 forbids `Domain=localhost` (browsers reject it). Local development uses host-only cookies. |
| **Path** | `"/"` | `"/"` | Available platform-wide. |
| **MaxAge** | `86400` (configurable) | `86400` (configurable) | Automatic session expiry in Redis and browser. |

### 3.2 Mobile & API Token Authentication (JWT + Refresh Tokens)
- **Access Token**: Short-lived (15 minutes) signed JWT (`HS256`) containing `user_id`, `provider`, and `roles`.
- **Refresh Token**: Long-lived (7 days) cryptographically random 256-bit token. The raw token is stored in client storage, while its SHA-256 hash is saved in PostgreSQL alongside device metadata (IP address, User-Agent).
- **Token Rotation & Theft Detection**:
  - Refresh tokens are single-use. When `/v1/auth/refresh` is called, the old token is revoked and a new pair is issued.
  - If an already-revoked refresh token is presented, the system detects a potential replay attack and **immediately revokes all active tokens for that user**.

### 3.3 Unified Session Resolver (`GetRequestSession`)
The backend provides a unified session resolver (`h.service.Auth.GetRequestSession`) that automatically detects and verifies the authentication method:
1. **Redis Session Cookie**: Looks up the active session in Redis via Gorilla Redistore.
2. **JWT Fallback**: If the cookie is absent or invalid, it inspects:
   - `Authorization: Bearer <token>`
   - `?token=<jwt>` query parameter (standard for WebSocket handshakes)
   - `access_token` / `auth_token` cookies
   and cryptographically validates the token signature using `common.VerifyAccessToken`.

### 3.4 Clean Logout & Cookie Expiration
On `/v1/auth/signout` or `/v1/auth/logout/{provider}`:
1. The Redis session is deleted.
2. The refresh token in PostgreSQL is revoked.
3. `clearAuthCookies` actively issues expired `Set-Cookie` headers (`MaxAge: -1`, `Expires: Jan 1 1970`) for all session and token cookie names to ensure complete removal from browser caches.

---

## 4. Realtime WebSocket Architecture

The platform provides a secure, low-latency WebSocket endpoint for real-time notifications and direct messaging.

### 4.1 Endpoint
- **URL**: `GET /v1/ws/notifications`
- **Protocol**: `ws://` (dev) or `wss://` (production)

### 4.2 WebSocket Authentication Handshake
In earlier versions, WebSockets accepted unverified plain cookies (`user_id`, `uid`), headers (`X-User-ID`), or query parameters (`?user_id=`). **This vulnerability has been completely eliminated.**

The WebSocket handshake now strictly authenticates clients via the unified backend architecture:
1. **Browser Session Cookie**: Automatically transmitted by the browser during the HTTP upgrade handshake and validated against Redis.
2. **Query Parameter Token (`?token=<jwt>`)**: Since standard browser `new WebSocket(url)` does not permit custom request headers, clients may pass their signed JWT access token in the query string.
3. **Authorization Header (`Bearer <jwt>`)**: Supported for mobile/native clients that support custom handshake headers.
4. **Database Verification**: Before upgrading the connection, the user ID is checked against the database to guarantee the user exists, is activated, and is **not banned**.

> [!CAUTION]
> Any request attempting to authenticate via raw `user_id` query parameters, `X-User-ID` headers, or unauthenticated plain cookies is immediately rejected with `401 Unauthorized`.

### 4.3 WebSocket Lifecycle & Concurrency (`internal/realtime`)
- **Connection Pool Manager (`realtime.Hub`)**: Runs as an independent background goroutine maintaining thread-safe client registries and user-to-connections mapping protected by an `RWMutex`. Injected directly into `handler.Handler` as `Handler.Hub`.
- **Client Lifecycle (`realtime.Client`)**:
  - **Read Pump (`ReadPump`)**: Monitors client health with Pong deadlines (`wsPongWait = 60s`) and enforces maximum message sizes (`wsMaxMessageSize = 4096`).
  - **Write Pump (`WritePump`)**: Handles non-blocking message delivery and regular Ping heartbeats (`wsPingPeriod = 54s`, `wsWriteWait = 10s`).
- **HTTP Upgrader (`realtime.Upgrade`)**: Origin-checked WebSocket upgrader validating against `FRONTEND_URL` and `localhost:3000`.
- **Broadcast System**: Handlers dispatch strongly-typed `realtime.OutboundMessage` envelopes via `h.Hub.SendJSONToUser(userID, payload)` with zero coupling to HTTP controller logic.

---

## 5. API Route Directory

All platform API routes are prefixed under `/v1`.

### 5.1 Public & Authentication Routes
| Method | Path | Description | Access |
|:---|:---|:---|:---|
| `GET` | `/ping` | Health check probe | Public |
| `POST` | `/v1/auth/email/signup` | Register user with email and password | Public |
| `POST` | `/v1/auth/email/signin` | Authenticate user; returns session cookie + JWT | Public |
| `POST` | `/v1/auth/signout` | Invalidate session, revoke tokens & clear cookies | Public |
| `POST` | `/v1/auth/refresh` | Rotate refresh token and renew access token | Public |
| `POST` | `/v1/auth/activate` | Activate account via email verification token | Public |
| `POST` | `/v1/auth/forgetpassword` | Request password reset email | Public |
| `POST` | `/v1/auth/reset-password` | Set new password using reset token | Public |
| `GET` | `/v1/auth/session` | Inspect current session state and roles | Public |
| `GET` | `/v1/auth/{provider}` | Initiate OAuth flow (Google, Discord, GitHub) | Public |
| `GET` | `/v1/auth/{provider}/callback` | OAuth redirect callback handler | Public |

### 5.2 Freelancers & Public Discovery
| Method | Path | Description | Access |
|:---|:---|:---|:---|
| `GET` | `/v1/freelancers` | List freelancers with filters and pagination | Public |
| `GET` | `/v1/freelancers/cities` | List unique cities with active freelancers | Public |
| `GET` | `/v1/freelancers/{id}` | Get detailed freelancer profile | Public |
| `GET` | `/v1/freelancers/{id}/similar`| Get similar freelancer recommendations | Public |
| `GET` | `/v1/freelancers/{id}/showcases`| List portfolio showcases of a freelancer | Public |
| `GET` | `/v1/freelancers/{id}/reviews`| List reviews and ratings for a freelancer | Public |
| `GET` | `/v1/jobs` | Browse published jobs | Public |
| `GET` | `/v1/jobs/{id}` | View single job specification | Public |
| `GET` | `/v1/showcases/{id}` | View specific project showcase | Public |

### 5.3 Authenticated User Endpoints
*Requires valid session cookie or JWT access token (`WithRequiredAuth`).*
| Method | Path | Description |
|:---|:---|:---|
| `GET` | `/v1/users/auth` | Retrieve authenticated user profile |
| `POST` | `/v1/users/verification` | Submit ID verification documents |
| `GET` | `/v1/freelancers/{id}/save` | Check if freelancer is bookmarked |
| `POST` | `/v1/freelancers/{id}/save` | Bookmark freelancer |
| `DELETE`| `/v1/freelancers/{id}/save` | Remove freelancer bookmark |
| `GET` | `/v1/me/saved-freelancers` | List current user's saved freelancers |
| `POST` | `/v1/onboarding/client` | Complete client onboarding |
| `POST` | `/v1/onboarding/freelancer` | Complete freelancer onboarding |
| `POST` | `/v1/upload` | Upload files (images, documents) |
| `POST` | `/v1/upload/video` | Upload project video files |
| `GET` | `/v1/notifications` | List user notifications |
| `POST` | `/v1/notifications/{id}/read`| Mark notification as read |
| `GET` | `/v1/ws/notifications` | Realtime notification and chat WebSocket |

### 5.4 Verified User Endpoints
*Requires authenticated user with `verification_status = "verified"` (`WithRequiredVerifiedUser`).*
| Method | Path | Description |
|:---|:---|:---|
| `GET` | `/v1/conversations` | List user conversation threads |
| `POST` | `/v1/conversations` | Create conversation thread |
| `GET` | `/v1/conversations/{id}` | Get conversation thread metadata |
| `GET` | `/v1/conversations/{id}/messages` | List paginated conversation messages |
| `POST` | `/v1/conversations/{id}/messages` | Send message (triggers realtime broadcast) |
| `POST` | `/v1/jobs` | Post new job opening |
| `PUT` | `/v1/jobs/{id}` | Update existing job opening |
| `POST` | `/v1/jobs/{id}/close` | Close job opening |
| `POST` | `/v1/jobs/{id}/proposals` | Submit proposal for a job |
| `POST` | `/v1/jobs/{id}/hire` | Hire candidate for a job |
| `GET` | `/v1/me/proposals` | List user's submitted proposals |
| `GET` | `/v1/me/projects` | List user's active projects |
| `GET` | `/v1/projects/{id}` | Get project details |
| `PATCH`| `/v1/projects/{id}` | Update project progress status |
| `POST` | `/v1/projects/{id}/complete` | Mark project as completed |
| `POST` | `/v1/projects/{id}/review` | Submit project review and rating |
| `GET` | `/v1/dashboard/client` | Client overview metrics and activities |
| `GET` | `/v1/dashboard/freelancer`| Freelancer dashboard stats and earnings |
| `GET` | `/v1/me/profile` | Get editable profile data |
| `PUT` | `/v1/me/profile` | Update profile information |
| `PUT` | `/v1/me/account` | Update account settings |
| `POST` | `/v1/me/password` | Change account password |

### 5.5 Admin & Moderation Endpoints
*Requires Admin JWT token (`WithRequiredAdmin`).*
| Method | Path | Description |
|:---|:---|:---|
| `POST` | `/v1/admin/auth/signin` | Admin credentials signin (returns 8h Admin JWT) |
| `GET` | `/v1/admin/analytics` | High-level platform KPIs and user counts |
| `GET` | `/v1/admin/users` | List platform users with filter parameters |
| `DELETE`| `/v1/admin/users/{id}` | Delete user account |
| `POST` | `/v1/admin/users/{id}/ban` | Ban user and invalidate access |
| `POST` | `/v1/admin/users/{id}/unban` | Unban user account |
| `POST` | `/v1/admin/users/{id}/warning` | Issue policy warning to user |
| `POST` | `/v1/admin/users/{id}/balance` | Credit balance to user account |
| `POST` | `/v1/admin/users/{id}/deduct-balance`| Debit balance from user account |
| `GET` | `/v1/admin/verifications` | List pending ID verifications |
| `POST` | `/v1/admin/verifications/{id}/review`| Approve or reject user verification |
| `GET` | `/v1/admin/moderation/flagged-messages`| Review flagged chat messages |

---

## 6. Configuration & Environment Variables

All settings are configured via environment variables (loaded from `docker/.env` or system environment):

| Variable | Type | Default | Description |
|:---|:---|:---|:---|
| `ENV` | `string` | `development` | Environment mode (`development` or `production`). |
| `API_URL` | `string` | `http://localhost:8000` | Public base URL of this API server. |
| `FRONTEND_URL` | `string` | `http://localhost:3000` | Base URL of the web frontend (used for CORS and cookies). |
| `JWT_SECRET` | `string` | `""` | Secret key used to sign and verify HMAC-SHA256 JWT tokens. |
| `SESSION_KEY` | `string` | `SECRET_KEY` | Secret key used to sign and encrypt session cookies in Redis. |
| `SECRET_KEY` | `string` | *(generated)* | Platform secret key fallback. |
| `ENCRYPTION_KEY` | `string` | `SECRET_KEY` | Key for encrypting sensitive fields at rest. |
| `DB_ADDR` | `string` | `""` | PostgreSQL connection DSN (`postgres://user:pass@host:5432/db?sslmode=disable`). |
| `DB_MAX_OPEN_CONNS` | `int` | `200` | Maximum open database connections in pool. |
| `DB_MAX_IDLE_CONNS` | `int` | `50` | Maximum idle database connections in pool. |
| `DB_MAX_IDLE_TIME` | `string` | `15m` | Maximum connection idle duration. |
| `DB_MAX_LIFETIME` | `string` | `60m` | Maximum connection lifetime. |
| `REDIS_ADDR` | `string` | `redis:6379` | Redis server address (`host:port`). |
| `REDIS_PASSWORD` | `string` | `""` | Redis authentication password. |
| `REDIS_DB` | `int` | `0` | Redis logical database index. |
| `RATE_LIMITER_ENABLED` | `bool` | `true` | Enables token bucket request rate limiting. |
| `RATE_LIMITER_TIME_FRAME` | `string` | `30s` | Sliding window duration for rate limits. |
| `RATELIMITER_REQUESTS_COUNT` | `int` | `1800` | Allowed requests per window per IP (60 req/sec). |
| `ACCESS_LOG_ENABLED` | `bool` | `isDev` | Enables structured HTTP request logging. |

---

## 7. Development & Deployment Operations

### 7.1 Running Database & Redis Infrastructure
```bash
cd Backend
docker compose -f docker/docker-compose.infra.yaml up -d
```

### 7.2 Running the Backend Locally
```bash
cd Backend
go run ./cmd/api
```

### 7.3 Running Tests
```bash
cd Backend
go test -v ./...
```

### 7.4 Compiling Production Binary
```bash
cd Backend
go build -ldflags="-s -w" -o ./bin/api ./cmd/api
```

# Monteur Admin Portal

A Django-admin-style web UI over the PostgreSQL database, written in Go. It
is a **separate binary on a separate port** that shares the API's database
and configuration, so you never need pgAdmin/psql to inspect or fix data.

```
go run ./cmd/admin        # → http://localhost:8001/admin/
```

Sign in with the bootstrap account (created automatically on first start if
it does not exist):

| Email               | Password   |
|---------------------|------------|
| `admin@monteur.com` | `test1234` |

These defaults apply in development only. In production (`ENV=production`)
the portal creates the account **only if `ADMIN_BOOTSTRAP_PASSWORD` is set**,
refuses to start if it is still `test1234`, and refuses an empty session key.
The account lives in the `admins` table — the same table the JSON admin API
(`/v1/admin/*`) authenticates against — and can be edited from the portal
itself under **Admins**.

## URL layout

Identical to Django's, so `api-v1.<domain>/admin/app/users/` in production:

| URL                                   | Page                                   |
|---------------------------------------|----------------------------------------|
| `/admin/`                             | Index — every model + recent actions   |
| `/admin/login/`, `/admin/logout/`     | Session auth (cookie, CSRF-protected)  |
| `/admin/two-factor/setup/`, `…/verify/` | TOTP enrolment (QR code) and challenge |
| `/admin/app/`                         | App index                              |
| `/admin/app/<table>/`                 | Changelist: search, filters, sort, paging, bulk delete |
| `/admin/app/<table>/add/`             | Add form                               |
| `/admin/app/<table>/<id>/change/`     | Change form                            |
| `/admin/app/<table>/<id>/delete/`     | Delete confirmation                    |

Query parameters follow Django too: `?q=` search, `?o=-created_at` ordering,
`?p=2` page, `?<column>=<value>` filters, and `_changelist_filters` carries
the list state through add/change pages so *Save* returns you where you were.

## What it does for you

- **Schema-driven forms.** Columns are introspected from PostgreSQL:
  `CHECK (col IN (...))` constraints become `<select>`s, booleans become
  checkboxes, `timestamp` → `datetime-local`, `jsonb` → validated JSON
  textarea, `text[]` → one-item-per-line textarea, foreign keys get an
  "Open related" link, and the changelist shows the related row's label
  (e.g. a client's email instead of a UUID).
- **Safe passwords.** `password_hash` columns render as password inputs;
  a non-empty value is bcrypt-hashed before writing, blank keeps the hash.
- **Database defaults respected.** Leaving a defaulted column blank on *Add*
  lets PostgreSQL fill it (`gen_random_uuid()`, `CURRENT_TIMESTAMP`, …).
- **Minimal writes + audit trail.** *Change* writes only the columns whose
  values actually differ and records `Changed a, b, c.` in `admin_log`
  (Django's `django_admin_log`), shown under *Recent actions*.
- **Friendly constraint errors.** Unique/FK/CHECK violations are shown on
  the form instead of a 500.

## Security

- **Login lockout** (django-axes semantics). Failures are counted per client
  IP *and* per account inside a rolling window; reaching the limit locks that
  subject for a cool-down. Wrong two-factor codes count too. A successful
  login clears the account's counter. State is in `admin_login_attempts`, so
  every replica enforces the same lock. Defaults: 5 failures / 15 min → 15 min.
- **Two-factor authentication** (django-otp semantics). TOTP (RFC 6238),
  compatible with Google Authenticator, Authy, 1Password, etc. Enrol from the
  header link *Set up two-factor*: scan the QR code, enter a code. From then
  on every login is challenged for a code; a code cannot be replayed. With
  `ADMIN_2FA_REQUIRED=true` (the production default) an admin who has not
  enrolled is sent to setup before they can see anything.
  **Lost device / onboarding a colleague:** another admin opens *Admins →
  that admin*. Next to *Totp secret* they can tick *Clear* (the person
  re-enrols on their next login) or click *Set up two-factor* to enrol them
  on the spot — the colleague scans the QR on *their* phone and reads out
  the code. The secret itself is never displayed; both actions are audited.
- Sessions are signed **and encrypted** cookies scoped to `/admin`, `HttpOnly`,
  `SameSite=Lax`, `Secure` in production. Every POST is CSRF-checked.
- All pages are `Cache-Control: no-store` and `X-Frame-Options: DENY`.

## Architecture

```
cmd/admin/main.go          entrypoint: env → DB → admin.New → http.Server
admin/
  app.go, config.go        wiring + ADMIN_* configuration
  registry/                which tables to expose and how  (≈ app/admin.py)
  site/                    Site / App / ModelAdmin registry (≈ admin.site)
  schema/                  PostgreSQL introspection → Table/Column/Kind
  repository/              generic parameterised SQL over any Table
  form/                    widgets, coercion, display formatting (≈ ModelForm)
  service/                 use cases: list/filter, add/change/delete, audit log, bootstrap
  auth/                    admins-table login, cookie sessions, CSRF, flash messages
  handler/                 chi routes and view models
  web/                     embedded templates + CSS, renderer
migrations/…_create_admin_log_table.sql
```

Dependencies point one way: `handler → service → repository → schema`, with
`site` and `form` as pure helpers. No package below `handler` imports
`net/http`; no package below `repository` writes SQL.

## Registering a table

Edit `admin/registry/registry.go`:

```go
{"invoices", site.ModelAdmin{
    ListDisplay:  []string{"number", "user_id", "total", "status", "issued_at"},
    SearchFields: []string{"number", "notes"},
    ListFilter:   []string{"status", "issued_at"},
    Ordering:     []string{"-issued_at"},
    ReprField:    "number",
}},
```

Every column name is validated against the live schema at startup, so a typo
fails the boot with a clear error. Omitted fields get Django-like defaults
(PK + first columns in the list, `-created_at` ordering, `id`/`created_at`/
`updated_at` readonly, `password_hash` treated as a password, 100 per page).
Set `DisableAdd`, `DisableChange` or `DisableDelete` for read-only tables.

## Configuration (`docker/.env`)

| Variable                   | Default                   | Purpose                                |
|----------------------------|---------------------------|----------------------------------------|
| `ADMIN_ADDR`               | `:8001`                   | Listen address                          |
| `ADMIN_BASE_PATH`          | `/admin`                  | URL prefix                              |
| `ADMIN_SITE_HEADER`        | `Monteur administration`  | Header text                             |
| `ADMIN_SITE_TITLE`         | `Monteur admin`           | `<title>` suffix                        |
| `ADMIN_SESSION_KEY`        | falls back to `SESSION_KEY` | Cookie signing key — set a real one   |
| `ADMIN_SESSION_MAX_AGE`    | `28800` (8 h)             | Session lifetime in seconds             |
| `ADMIN_SECURE_COOKIES`     | `true` in production      | `Secure` flag on the session cookie     |
| `ADMIN_BOOTSTRAP_EMAIL`    | `admin@monteur.com`       | First-run superuser                     |
| `ADMIN_BOOTSTRAP_PASSWORD` | `test1234` (dev only)     | Required in production; `test1234` refused |
| `ADMIN_BOOTSTRAP_NAME`     | `Monteur Admin`           |                                         |
| `ADMIN_LOGIN_MAX_FAILURES` | `5`                       | Failures before lockout (0 disables)    |
| `ADMIN_LOGIN_WINDOW`       | `15m`                     | Window in which failures accumulate     |
| `ADMIN_LOGIN_LOCKOUT`      | `15m`                     | How long a locked subject stays locked  |
| `ADMIN_2FA_REQUIRED`       | `true` in production      | Force every admin to enrol in TOTP      |
| `ADMIN_2FA_ISSUER`         | `Monteur admin`           | Label shown in the authenticator app    |

Database settings (`DB_ADDR`, …) are shared with the API.

## Production

`docker/docker-compose.yaml` includes an `admin` service (built from
`docker/Dockerfile.admin`) bound to `127.0.0.1:8001` — reachable only through
the reverse proxy on the host, never directly. At startup it waits up to 90 s
for the API container's `goose up` to create the tables it manages. Route it
from the API host so the public URL is `https://api-v1.<domain>/admin/…`:

```nginx
location /admin/ {
    proxy_pass         http://admin:8001;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    # Optional: restrict to office/VPN IPs
    # allow 203.0.113.0/24; deny all;
}
```

The migration `20260911000021_create_admin_log_table.sql` must be applied
before the portal starts (the API container's entrypoint runs `goose up`).

## Tests

```
go test ./admin/...            # everything: unit + integration (~10 s)
go test ./admin/tests/ -v      # integration suite with timings
```

Unit tests next to each package cover the pure logic (CHECK-constraint
parsing, form coercion, SQL builders, registry defaults).

`admin/tests/` is the integration suite. It boots the real portal against
the PostgreSQL in `docker/.env` (and skips itself if the database is not
reachable) and drives it over HTTP like a browser, in ordered phases:

| Phase            | What it proves                                                                 |
|------------------|--------------------------------------------------------------------------------|
| Auth             | login/logout, wrong password, session gating, CSRF on every POST, `next=` open-redirect guard, deactivated admin |
| Lockout          | 5 failures lock IP + account, correct password refused while locked, expiry, rolling window |
| CRUD             | for **every registered table**: add via the generated form → listed instantly → change form round-trips untouched (`No fields changed.`) → one column edited → DB + `admin_log` verified; bulk delete with confirmation; read-only tables refuse writes |
| Changelist       | every sort order, every filter link, search (incl. `%_\` metacharacters), paging edge cases, 404s for bad models/keys, FK labels |
| Validation       | required fields, bad JSON/UUID/number/date/choice, varchar length, unique/FK/CHECK/numeric-overflow violations shown as form errors, readonly columns ignored, password hashing |
| InstantRefresh   | a direct SQL update is visible on the next request; add/delete visible immediately; `Cache-Control: no-store` |
| TwoFactor        | enrol via QR/secret, challenge on next login, wrong/replayed codes, lockout on bad codes, colleague reset from Admins page, mandatory mode redirects to setup |
| Performance      | seeds 5 000 users, times index/changelist/filter/sort/search/page/change/add (budgets: mean < 250 ms, max < 750 ms) and a 16-way concurrent burst |
| Cleanup          | deletes every fixture through the portal, children first                        |
| Isolation        | row count + `md5` checksum of every table equal before and after — the suite touched nothing else |

Every row the suite writes carries the `admintest-` marker; a catch-all purge
runs before and after, so an aborted run never leaves debris. As a safety net
the suite only runs when `DB_ADDR` points at localhost (override with
`ADMIN_TESTS_ALLOW_REMOTE_DB=1`). Registering a
new table without adding it to `creationOrder` fails the suite on purpose.

# OLYMPIAN API and authentication

The Express API now requires a server-side session for all fitness and profile operations. Authentication uses Argon2id, express-session, and a MongoDB-backed connect-mongo store. Existing users, workouts, plans, challenges and participation records are preserved.

## Local setup

Use Node.js 22.12+ and install the locked dependencies:

```sh
cd /home/akshat/OLYMPIAN/backend
npm ci
npm start
```

Keep your existing ignored `.env`. Use `.env.example` as a reference; do not overwrite a working MongoDB URI or secret. The required settings are:

| Variable                | Meaning                                                                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONGO_URI`             | Your existing private MongoDB connection URI. Never put this in frontend configuration.                                                                                                                  |
| `SESSION_SECRET`        | Required; at least 32 characters. Generate a cryptographically random value, keep it private, and keep it stable across restarts.                                                                        |
| `TRUSTED_ORIGINS`       | Comma-separated exact frontend origins, with scheme and port and no trailing slash/path. Defaults in development to `http://localhost:5173,http://127.0.0.1:5173`. Required HTTPS origins in production. |
| `MONGO_DB_NAME`         | Defaults to `olympian`; used for both application data and sessions.                                                                                                                                     |
| `SESSION_MAX_AGE_HOURS` | Absolute session lifetime, 1–168 hours; defaults to 24.                                                                                                                                                  |
| `NODE_ENV`              | Set to `production` behind HTTPS.                                                                                                                                                                        |
| `HOST` / `PORT`         | Defaults to `127.0.0.1:5000`. Keep the backend on loopback behind local Nginx.                                                                                                                           |

Generate a secret locally and paste it into your ignored `.env`:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

Do not share the output. No real secret is included in source or the example environment file. Changing the secret invalidates existing signed session cookies.

Start the frontend separately with `cd ../frontend` then `npm run dev`. Use its Vite `/api` proxy; no frontend environment file is required for the standard setup. Use one hostname consistently in your browser.

## Account flow

1. `POST /api/auth/register` validates the name, normalized email, password and optional fitness preferences. Passwords must be 15–128 characters; confirmation is checked by the frontend. Argon2id uses 64 MiB memory, three iterations and parallelism one.
2. Registration checks normalized legacy addresses and relies on the unique email index for concurrent new registrations. Existing accounts are never claimed or overwritten.
3. Registration and login regenerate the session ID, store the authenticated user ID and absolute expiry, explicitly save to MongoDB, then return a safe user profile and an HTTP-only cookie. Missing accounts and passwordless legacy accounts use a dummy verification hash and return the same login failure message as an incorrect password.
4. `GET /api/auth/me` restores the authenticated profile on refresh. Every protected request checks the session expiry and confirms that the account still exists.
5. `POST /api/auth/logout` destroys the MongoDB session and clears the cookie. The frontend unmounts user data and redirects to login. Late profile responses cannot restore a logged-out account.

The cookie is `olympian.sid` during local HTTP development. In production it is `__Host-olympian.sid`, with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no Domain attribute. It expires after the configured lifetime. Sessions do not silently become permanent through activity: the server also checks their absolute authentication expiry.

Login permits ten failed attempts per IP per 15 minutes. Registration permits ten attempts per IP per 15 minutes, including successful registrations. Both return JSON errors and rate-limit headers. These limits are per running Node process.

## Origin and request requirements

Every state-changing `/api` request, **including registration, login and logout**, must:

- Include an exact allowlisted `Origin` header.
- Use `Content-Type: application/json` and a JSON object body.
- Not declare `Sec-Fetch-Site: cross-site`.

Missing, null, lookalike and untrusted Origins are rejected with 403. There is no Referer or request-Host fallback. Credentialed CORS is allowed only for configured origins. Cookies use SameSite=Lax; the intended production deployment serves the frontend and `/api` under the same public HTTPS origin.

Browser Fetch includes credentials and sends its own Origin header. For an intentional local CLI mutation, supply the trusted Origin and maintain the session cookie jar yourself. No JWT or session identifier is stored in browser localStorage.

The implementation follows the relevant [Express session documentation](https://expressjs.com/en/resources/middleware/session/), [OWASP Origin-validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), and [node-argon2 API](https://github.com/ranisalt/node-argon2).

## Endpoints and authorization

| Method | Endpoint                          | Behavior                                                                    |
| ------ | --------------------------------- | --------------------------------------------------------------------------- |
| POST   | `/api/auth/register`              | Create a new credential-bearing account and sign in.                        |
| POST   | `/api/auth/login`                 | Verify credentials and regenerate the session.                              |
| GET    | `/api/auth/me`                    | Return `{ user }` for the authenticated account.                            |
| POST   | `/api/auth/logout`                | Destroy the session and clear the cookie; idempotent if already signed out. |
| PATCH  | `/api/users/me`                   | Update only the caller's supported profile fields.                          |
| POST   | `/api/workouts`                   | Create a workout owned by the session user.                                 |
| GET    | `/api/workouts/user/:userId`      | Read the caller's history; another ID returns 403.                          |
| GET    | `/api/workouts/stats/:userId`     | Read the caller's aggregation; another ID returns 403.                      |
| POST   | `/api/plans/generate`             | Save a rule-based plan owned by the session user.                           |
| GET    | `/api/plans/user/:userId`         | Read only the caller's saved plans.                                         |
| GET    | `/api/challenges`                 | Authenticated discovery.                                                    |
| POST   | `/api/challenges/:id/join`        | Join as the session user; duplicate returns 409.                            |
| GET    | `/api/challenges/:id/leaderboard` | Authenticated rankings, capped at 20.                                       |
| POST   | `/api/challenges`                 | Returns 403 for ordinary accounts; no administrator role is invented.       |

User collection listing/creation and `PATCH/DELETE /api/users/:id` are removed. They return 404 to authenticated callers; unauthenticated API requests return 401. New accounts use registration, and profile edits use `/api/users/me`.

`PATCH /api/users/me` accepts `name`, `fitnessGoal`, `experienceLevel`, and `workoutDaysPerWeek` only. Extra fields, including email, passwordHash, IDs, userId and roles, return 403. Invalid supported values return 400. The profile permits 1–7 workout days, while the planner retains its existing 3–6-day contract.

Workout, plan and join writes derive identity from the session. The frontend omits `userId`. A mismatching supplied userId is rejected with 403; an identical legacy value cannot change ownership. User-specific reads validate the path ID and require that it matches the authenticated account. Existing aggregation, rule-based planning, challenge scoring and duplicate participation behavior are preserved.

Responses never include passwordHash. The model uses `select: false`, JSON/object transforms remove the field, and account routes use an explicit safe-profile serializer. API responses use `Cache-Control: no-store`. Unexpected errors are sanitized; request bodies, cookies, hashes and connection details are not logged.

## Existing accounts and indexes

PasswordHash remains optional at the model level solely to preserve legacy records; the registration route always creates a real hash. Passwordless accounts cannot sign in, register over the same normalized email, or be automatically assigned credentials. Ambiguous case/whitespace duplicates are also denied. A legitimate, identity-verified migration/reset process is needed for these accounts and is not implemented here.

Startup ensures there is a full unique `users.email` index. If missing, it attempts to create it. A conflicting index or duplicate records stops startup with a safe error. The application never drops conflicting indexes, deletes duplicates, changes legacy email values or rewrites existing account credentials. Resolve such conflicts through a deliberate data-review/migration process.

Sessions are stored in the same configured database's `sessions` collection with TTL expiry. The database user needs normal application read/write and index permissions. Existing domain models and collections retain their names.

## Tests

```sh
cd /home/akshat/OLYMPIAN/backend
npm test

cd ../frontend
npm test -- --workers=2
npm run build
```

Backend tests use Node's test runner, Supertest, actual Argon2id, express-session, connect-mongo, Mongoose, and a real temporary MongoDB process from mongodb-memory-server. Browser authentication tests use the same app against another isolated MongoDB process on test API port 5001; Vite forwards test requests to that API. Other frontend regressions use explicit API fixtures.

The harnesses never load `backend/.env`, never accept the existing Atlas URI and never use the live database. They may download a MongoDB test binary on their first run. If the host needs a specific compatible distribution binary, use mongodb-memory-server's `MONGOMS_DISTRO` setting, such as `ubuntu-22.04` on a compatible Linux host. Normal test commands were verified on this workstation without that override.

## AWS Lightsail / Nginx

A same-host HTTPS Nginx example is provided in `../deploy/nginx.conf.example`. It is a template, not an applied or tested deployment.

For deployment:

1. Build the frontend with `VITE_API_BASE_URL` empty so requests use same-origin `/api`.
2. Configure the real domain, TLS certificates and frontend build path in Nginx.
3. Set backend `NODE_ENV=production`, a strong persistent `SESSION_SECRET`, `TRUSTED_ORIGINS=https://your-domain`, the existing private MongoDB URI and `HOST=127.0.0.1`.
4. Keep port 5000 private. The app trusts only loopback proxies; Nginx overwrites forwarded IP/protocol headers and terminates HTTPS itself.
5. Validate the completed Nginx configuration, run Node under a process manager/service, and test registration, cookie flags, refresh, expiry and logout over the real HTTPS domain.

The example CSP allows inline styles for Motion and Recharts; scripts, fonts, assets and API connections are same-origin. Additional proxy hops or a separately hosted cross-site frontend need a deliberate trust/cookie/CORS review rather than weakening the Origin checks.

## Remaining limitations

- No email verification, password reset/change, MFA, account deletion, administrator provisioning or credential migration/reset workflow is included. Registration alone does not verify email ownership.
- Rate limiting uses process memory. Multiple API instances need a shared limiter and correctly configured edge/proxy controls. Public hosting also needs operational monitoring, backups and managed secret handling.
- Strict Origin validation is the implemented CSRF defense; no CSRF-token endpoint is needed by this design.
- Challenge progress remains best effort after logging a workout; failures can leave totals stale until server-side reconciliation. User-specific challenge membership outside the returned top 20 still needs a dedicated backend read endpoint.
- Nginx, actual HTTPS, AWS deployment and an external security assessment were not run. Passing tests does not establish production security.

## Files changed

Created `app.js`, `config.js`, `middleware/security.js`, `routes/fitness.js`, `utils/validation.js`, `utils/ensureUserIndex.js`, `.env.example`, and the `tests/` harness. Replaced the partial `routes/auth.js`, refactored `server.js`, updated `models/User.js`, and updated package/test configuration, lockfile and environment-file ignore rules. `backend/.env` was not edited.

Runtime authentication dependencies already present in this checkout were retained: argon2 0.45.1, express-session 1.19.0, connect-mongo 6.0.0 and express-rate-limit 8.7.1. Added only development test tools: Supertest 7.3.1 and mongodb-memory-server 11.3.0. Updated the compatible transitive body-parser dependency to its patched version.

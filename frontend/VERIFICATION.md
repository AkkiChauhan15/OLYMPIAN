# Authentication verification

## Passed

- **Backend:** `cd backend && npm test` — 20 tests passed using Node.js 22.22.2, actual Argon2id, Express sessions, connect-mongo, Mongoose and an isolated MongoDB process.
- **Browser:** `cd frontend && npm test -- --workers=2` — 35 tests passed using Google Chrome 155.0.8059.39.
- **Production build:** `cd frontend && npm run build` — passed with Vite 8.3.5. Artifacts are in `frontend/dist/`.
- **Dependency audits:** `npm audit --json` reported zero known advisories in both backend and frontend. The vulnerable transitive body-parser dependency was updated within Express's supported range.
- **Frontend secret-marker check:** no MongoDB URI markers, `MONGO_URI` or `SESSION_SECRET` appeared in frontend application source or its production bundle.

## Backend coverage

- Registration with normalized unique email, real Argon2id hash, optional preferences and automatic sign-in.
- Duplicate/invalid registrations and disallowed sensitive fields.
- Correct login, generic incorrect-password/missing-account/legacy-account errors, and MongoDB-backed persistence across app recreation.
- Password hash default exclusion and serialization protection.
- Legacy credentials left untouched; canonical duplicate legacy addresses cannot be logged in or claimed.
- Logout destruction, cookie clearing, replay rejection and absolute server-side session expiry.
- Unauthenticated denial across fitness/account APIs; ownership checks for workouts, statistics and plans.
- Session-derived workout/plan/join identity and rejected impersonation.
- Existing workout aggregation, plan generation, participation, duplicate joins, challenge progress and ranking behavior.
- Retired public user management, protected profile updates and denied challenge creation.
- Session ID regeneration and invalidation of the previous cookie.
- Strict Origin/content-type checks, including login, registration and logout, plus authentication rate limiting.
- Production `__Host-`/Secure/HttpOnly/SameSite/Path cookie settings with a trusted forwarded-HTTPS request.
- Startup configuration validation and safe unique-index initialization that preserves duplicate legacy records.

## Browser coverage

Real full-stack tests exercise registration, duplicate email, password confirmation, wrong-password errors, successful login, refresh persistence, HttpOnly cookie behavior, absence of authentication state in localStorage, logout, protected/guest route redirects, account isolation, workout logging, plan generation, joining and scoring, and saved profile changes.

API-fixture regressions retain the existing dashboard/history/planner/challenge/ranking/profile coverage and test session initialization errors, expired sessions, save failures, incomplete statistics, empty data, membership outside the top 20, and a delayed profile response arriving after logout. The test API is an isolated local instance; the final test configuration explicitly overrides configured live backend origins.

All eight screens fit 320, 390, 768 and 1440 pixel viewports without page-level horizontal overflow; authentication headline clipping is also checked. Automated axe A/AA rule scans passed for all protected pages and both auth screens at mobile/desktop sizes, plus the workout dialog. Reduced motion, keyboard dismissal and focus restoration were exercised. These scans do not establish complete accessibility conformance.

Nine fixture-only screenshots were reviewed/saved under `/tmp/olympian-*.png`: desktop/mobile login and registration, plus desktop dashboard, planner, challenges, leaderboard and profile. The screenshot helper reported no JavaScript page errors.

## Verification boundaries

- Authentication testing did **not** load `backend/.env`, connect to Atlas, or change existing users, credentials, workouts, plans, challenges or rankings. Test databases were temporary local MongoDB instances; domain fixtures were isolated.
- The existing private environment file was not edited.
- No AWS, actual TLS, Nginx validation/deployment or external penetration test was performed. The Nginx file is an unapplied example; cookie behavior was checked through the backend's forwarded-HTTPS test harness.
- No password reset/change, email ownership verification, MFA, administrator role, account deletion or legacy credential migration is implemented. Passwordless legacy accounts remain unable to sign in.
- IP rate-limit state is local to one API process; a distributed deployment needs a shared limiter. Challenge progress remains best effort, and rankings still return at most 20 participants.

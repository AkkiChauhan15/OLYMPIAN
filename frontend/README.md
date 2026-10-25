# OLYMPIAN frontend

Train Smarter. Rise Stronger.

The premium React fitness workspace now uses real session authentication. Registration, login, refresh persistence, logout and profile editing are integrated with the existing fitness dashboard. The Demo User Selector and public user-list requests have been removed.

## Start locally

Use Node.js 22.12+ and two terminals:

```sh
# Terminal 1
cd /home/akshat/OLYMPIAN/backend
npm ci
npm start
```

```sh
# Terminal 2
cd /home/akshat/OLYMPIAN/frontend
npm ci
npm run dev
```

First ensure the ignored backend `.env` has the required MongoDB URI and a strong `SESSION_SECRET`. Backend configuration, legacy-account behavior and deployment instructions are documented in [backend/README.md](../backend/README.md) and [backend/.env.example](../backend/.env.example).

Open `http://127.0.0.1:5173`. Create a new account, or sign in with an existing account that already has valid credentials. Passwordless legacy accounts are preserved but cannot be claimed through registration.

## Authentication flow

- `/register` includes name, email, password/confirmation, fitness goal, experience and frequency. It validates confirmation locally and sends registration to the API. Successful registration signs in automatically.
- `/login` verifies email/password through the API. Both screens include password visibility toggles, loading/error states and links between screens.
- AuthContext checks `GET /api/auth/me` before rendering protected content. A failed server connection offers a retry; a 401 shows login. Signed-in users visiting guest screens return to their dashboard.
- The account menu replaces the selector and contains profile navigation and **Log out**. Logout destroys the server session, clears the cookie, unmounts all cached athlete data and redirects to login. Session-expiry responses also clear protected state.
- Session changes recreate AppProvider, so an account signed in later cannot inherit the prior account's workouts, plans or challenge membership. Late profile responses from an earlier session cannot restore that account.
- No password, JWT or session identifier is stored in localStorage. All Fetch requests include credentials. The browser supplies the Origin header checked by the backend.

## Fitness pages preserved

- **Dashboard** — authenticated greeting, all-time API statistics, training activity chart, weekly commitment ring, saved routine, recent workout details and challenge preview.
- **Workout Tracker** — multiple exercises/sets, repetitions and kilograms, validated logging, searchable/filterable expandable history, activity chart and summary statistics.
- **Workout Planner** — goal, experience and 3–6-day preferences, saved rule-based generation, seven-day exercise/rest schedule and plan library.
- **Challenges** — discovery/status filters, real dates/targets/points, active joining, duplicate handling and API-returned progress only.
- **Leaderboard** — challenge selector, podium, remaining rankings and the authenticated athlete's position when returned.
- **Profile** — supported name/fitness edits through `PATCH /api/users/me`, read-only email and activity overview.

The dark/lime design, local gym photograph, locally bundled font, responsive navigation, charts, reduced motion, keyboard focus styles and native workout dialog remain. Auth screens share this visual system. Empty and failed requests do not become invented workout statistics.

## API/configuration

The Vite development proxy forwards `/api` to `http://localhost:5000`. No frontend environment file is required by default. See `.env.example`:

| Variable            | Meaning                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Public backend origin, without `/api`. Keep empty for local proxy or same-origin Nginx deployment. Embedded at build time. |
| `API_PROXY_TARGET`  | Development-only proxy destination. Defaults to `http://localhost:5000`.                                                   |

Do not put MongoDB credentials or the session secret in frontend environment variables. Use a consistent browser hostname. For a standalone production preview with no same-origin proxy, rebuild with a matching backend origin and configure trusted origins/cookies deliberately; same-origin hosting is recommended.

The central client uses a 15-second timeout, cancellation, `credentials: include`, readable errors and session-expiry handling. Workout/plan/join requests no longer send userId. Read URLs use the authenticated profile ID and are independently authorized by the server. Profile PATCH uses `/users/me`; public `/users` operations are absent.

## Build and tests

```sh
cd /home/akshat/OLYMPIAN/frontend
npm run build
npm test -- --workers=2
```

Install the backend's locked dependencies as well: Playwright starts the isolated backend test API on 5001 and Vite on 5173. Both ports must be free. Tests explicitly use same-origin requests and the isolated API rather than a configured live backend. Stop development preview servers before running the suite.

Authentication browser tests exercise the actual backend, Argon2id and MongoDB sessions: registration/duplicates, wrong-password errors, refresh persistence, cookie properties, logout, protected routes, account switching, workout logging, plan generation, challenge joining/progress and profile persistence. Remaining page regression tests use explicit fixtures, including error cases, stale responses after logout and membership beyond the top 20. Screens are checked at 320, 390, 768 and 1440 pixels; axe scans desktop/mobile routes and the workout dialog. Automated accessibility scans do not establish complete accessibility conformance.

Playwright uses `/usr/bin/google-chrome` when available. Otherwise run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium browser. mongodb-memory-server may download a local test binary the first time.

`npm run preview` serves `dist/` for build inspection. It does not supply the development API proxy. For production use the same-origin Nginx setup in [deploy/nginx.conf.example](../deploy/nginx.conf.example), after adapting and validating it.

To create fixture-only screenshots, start the Vite preview with `npm run dev` and run `node scripts/qa.mjs`. It intercepts API calls and writes nine screenshots under `/tmp/olympian-*.png`; it performs no live database operations.

## Installed frontend dependencies

Runtime versions remain pinned: React/React DOM 19.3.1, React Router DOM 7.18.4, Lucide React 1.61.0, Recharts 3.10.1, Motion 14.6.0 and Manrope Variable 5.3.0. Development tools: Vite 8.3.5, Vite React plugin 6.1.2, Tailwind CSS/Vite plugin 4.3.3, Playwright 1.64.1 and axe-core Playwright 4.14.0. No additional frontend authentication dependency was needed.

## Changed frontend files

Created `src/context/AuthContext.jsx`, `src/pages/AuthPage.jsx`, and `tests/auth.spec.js`. Updated App/route protection, AppContext, API client, account menu, profile editing, identity-free mutation payloads, authentication-related copy/styles, regression fixtures/tests, Playwright server setup, screenshot helper and environment-file ignore rules. The existing six fitness pages remain functional.

## Limits and verification

See [VERIFICATION.md](VERIFICATION.md) for actual test results and [backend/README.md](../backend/README.md) for security/deployment limits. Email verification, password reset/change, MFA, legacy credential migration and destructive account management are not implemented. Challenge membership/progress is shown only when confirmed by a join or returned in the top-20 leaderboard.

AWS/Nginx deployment has not been performed. The session cookie and forwarded-HTTPS configuration were exercised in backend tests; actual TLS/proxy behavior still needs deployment verification.

The locally bundled photograph is sourced from [Unsplash](https://images.unsplash.com/photo-1534438327276-14e5300c3a48). Brand marks are SVG; interface icons are Lucide. No image-generation service was used.

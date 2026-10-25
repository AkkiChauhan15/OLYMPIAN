# OLYMPIAN

Train Smarter. Rise Stronger.

A React fitness workspace backed by Express, Mongoose and MongoDB, with Argon2id passwords and MongoDB-backed cookie sessions. Includes workout logging, rule-based weekly plans, challenges, leaderboards and personal fitness profiles.

- [Backend setup, authentication, security limits and API contracts](backend/README.md)
- [Frontend setup, features and browser tests](frontend/README.md)
- [Verification results](frontend/VERIFICATION.md)
- [HTTPS Nginx deployment example](deploy/nginx.conf.example)

Use Node.js 22.12+. Keep the existing private MongoDB configuration in `backend/.env`, add a strong `SESSION_SECRET` if needed, and see `backend/.env.example` for the supported configuration. Do not overwrite existing secrets or copy them to the frontend.

In separate terminals:

```sh
cd /home/akshat/OLYMPIAN/backend
npm ci
npm start
```

```sh
cd /home/akshat/OLYMPIAN/frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`, register a new account, or sign in with an account that already has credentials. Legacy passwordless accounts remain intact and require a legitimate credential migration/reset process before they can sign in.

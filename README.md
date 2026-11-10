# Tally Business

Accounting, GST billing and inventory management for Indian SMBs. Built with React (Vite) and Tailwind on the front end; Node, Express and MongoDB on the back end; Firebase Storage for files; deployed on Vercel.

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Architecture, auth, RBAC, multi-tenant accounts, Firebase upload service, app shell | **Done** |
| 2 | Companies, dashboard KPIs, parties, inventory, sales & purchases | Next |
| 3 | Double-entry vouchers, GST, financial reports, PDF/Excel export | Planned |
| 4 | Hardening, performance, deployment verification | Planned |

## Architecture

```
tally-business-app/
├── client/                 React + Vite + Tailwind v4 (deployed as its own Vercel project)
│   ├── src/components/     UI kit (Button, Field, Modal, Feedback, Avatar), route guards
│   ├── src/layouts/        AuthLayout, AppLayout (sidebar + topbar), navigation config
│   ├── src/pages/          auth/*, Dashboard, Profile, Users
│   ├── src/store/          Redux Toolkit (auth slice)
│   ├── src/services/       axios instance + API services
│   ├── src/firebase/       lazy Firebase init + reusable upload service
│   ├── src/hooks/ context/ utils/
│   └── vercel.json         /api rewrite to backend + SPA fallback
├── server/                 Express API (deployed as a Vercel serverless function)
│   ├── api/index.js        Vercel entry
│   ├── app.js / index.js   Express app / local listener
│   ├── config/             env validation (zod), Mongo connection cache, Firebase Admin
│   ├── models/             User, Account, AuditLog
│   ├── controllers/ routes/ middleware/ services/ validators/ utils/
│   ├── scripts/            createSuperAdmin.js
│   └── tests/              node:test + supertest integration tests
├── storage.rules           Firebase Storage security rules
└── firebase.json
```

### Key design decisions

- **Tenancy.** Signing up creates an **Account**, the business workspace, and makes that user its Admin. Admins invite Accountants and Staff. In phase 2 an account will own many **Companies**, and every company-scoped document will carry `companyId`.
- **Roles.** `super_admin` (platform-level, created only by script), `admin`, `accountant` and `staff`. The permission matrix is in `server/utils/permissions.js`, and `/api/auth/me` returns the caller's permissions, so the UI never hard-codes role logic.
- **Sessions.** The JWT is kept in an **httpOnly, SameSite=Lax cookie**. The client calls `/api` on its own origin: the Vite proxy handles this in dev and a Vercel rewrite in production, so no cross-site cookies are needed. Each user has a `tokenVersion`; incrementing it revokes all of their sessions. This happens on logout-everywhere, password change or reset, role change and deactivation.
- **CSRF.** Every state-changing request must send `X-Requested-With: XMLHttpRequest`. Browsers can't add that header cross-origin without a CORS preflight, and our CORS policy rejects unknown origins.
- **Files.** The browser uploads straight to Firebase Storage. Before uploading, it signs in to Firebase with a **custom token minted by the API**, which carries `uid` and an `acct` claim. `storage.rules` uses these to confine each user to `users/{uid}/…` and `accounts/{acct}/…`, and also enforces file types and sizes. Deletes go through the API, which checks path ownership. The service-account key exists only in the server's environment.
- **Audit log.** Security and data changes are recorded in `AuditLog`. The model blocks updates and deletes, and later financial modules will write audit entries inside the same MongoDB transaction as the change they record.

## Local development

**Requirements:** Node 20+ and MongoDB, either local or a free Atlas cluster. Phase 3 uses multi-document transactions, which need a replica set; Atlas clusters are always replica sets.

```bash
npm run install:all
cp server/.env.example server/.env    # set MONGODB_URI and JWT_SECRET at minimum
cp client/.env.example client/.env    # Firebase keys are optional for now

npm run dev:server    # http://localhost:5000/api
npm run dev:client    # http://localhost:5173
```

Without SMTP, the API **prints verification, reset and invite links to its console**. In non-production builds the UI also shows the link, so you can complete every flow locally. Links are built from `CLIENT_URL`, so keep it set to the port the client actually runs on.

Create the platform super admin:

```bash
npm --prefix server run create-super-admin -- --email you@example.com --name "Your Name" --password "Str0ngPassword"
```

### Tests

```bash
npm test     # needs MongoDB at mongodb://127.0.0.1:27017 (override with TEST_MONGODB_URI)
```

The tests cover registration and validation, email verification (including single-use tokens), CSRF rejection, operator-injection payloads, account lockout, password reset and change with session revocation, invite flow, RBAC, cross-tenant isolation, audit-log immutability and the storage-not-configured path.

## API (phase 1)

All responses look like `{ success, data, message? }` or `{ success: false, error: { code, message, details? } }`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | none | DB, storage and email status |
| POST | `/api/auth/register` | none | `{ name, email, password, businessName }` |
| POST | `/api/auth/verify-email` | none | `{ token }` |
| POST | `/api/auth/resend-verification` | none | `{ email }` |
| POST | `/api/auth/login` | none | sets session cookie; locks for 15 min after 5 failures |
| POST | `/api/auth/logout` | none | clears cookie |
| POST | `/api/auth/logout-all` | user | revokes every session |
| POST | `/api/auth/forgot-password` | none | always returns the same generic response |
| POST | `/api/auth/reset-password` | none | `{ token, password }`; also used to accept invites |
| GET / PATCH | `/api/auth/me` | user | profile: `name`, `phone`, `avatar` |
| POST | `/api/auth/change-password` | user | `{ currentPassword, newPassword }` |
| GET | `/api/users` | `users:manage` | `?page&limit&search&role&status` |
| POST | `/api/users/invite` | `users:manage` | `{ name, email, role }` |
| PATCH | `/api/users/:id` | `users:manage` | `{ role?, isActive? }` |
| POST | `/api/storage/token` | user | Firebase custom token for uploads |
| DELETE | `/api/storage/file` | user | `{ path }`; ownership is checked |

## Setting up services

### MongoDB Atlas

1. Create a free M0 cluster at <https://cloud.mongodb.com>.
2. Under **Database Access**, add a user with *Read and write to any database*.
3. Under **Network Access**, add `0.0.0.0/0`. Vercel functions have no fixed IPs; the credentials are the guard.
4. Go to **Connect → Drivers**, copy the URI and add a database name such as `/tally_business`. Put it in `MONGODB_URI`.

### Firebase Storage

1. Create a project at <https://console.firebase.google.com>.
2. Go to **Build → Storage → Get started** to create the bucket.
3. Go to **Build → Authentication → Get started**. No sign-in provider needs to be enabled, because custom tokens work without one.
4. Go to **Project settings → General → Your apps → Web app** and copy the config into `client/.env` (`VITE_FIREBASE_*`).
5. Go to **Project settings → Service accounts → Generate new private key**. Copy `project_id`, `client_email` and `private_key` into `server/.env` (`FIREBASE_*`), and set `FIREBASE_STORAGE_BUCKET` to the bucket name. **Never commit this JSON.**
6. Deploy the rules: `npm i -g firebase-tools && firebase login && firebase use <project-id> && firebase deploy --only storage`.
7. Make the IAM change that lets the service account mint custom tokens: in Google Cloud IAM, grant it **Service Account Token Creator**. Projects created recently usually already have this.

### Email (SMTP)

Any SMTP provider works, for example Resend, Brevo, SendGrid, Amazon SES or a Gmail app password. Set the `SMTP_*` variables and `EMAIL_FROM`. **SMTP is required in production**: without it, the API refuses to "send" mail rather than silently dropping it.

## Deploying to Vercel

Create **two Vercel projects** from the same GitHub repo.

1. **Push to GitHub.**
   ```bash
   git add . && git commit -m "Phase 1: auth, RBAC, storage, app shell"
   git branch -M main
   git remote add origin https://github.com/<you>/tally-business-app.git
   git push -u origin main
   ```
2. **API project.** Set *Root Directory* to `server` and *Framework* to `Other`. Add the environment variables from `server/.env.example`, with `NODE_ENV=production`, a 48+ byte `JWT_SECRET`, `CLIENT_URL=https://<your-client>.vercel.app` and `COOKIE_SAMESITE=lax`. Deploy, then check `https://<api>.vercel.app/api/health`.
3. **Client project.** Set *Root Directory* to `client` and *Framework* to `Vite`. In `client/vercel.json`, replace `YOUR-API-PROJECT.vercel.app` with the API domain and commit. Add the `VITE_FIREBASE_*` variables and leave `VITE_API_URL=/api`. Deploy.
4. In Firebase, go to **Authentication → Settings → Authorized domains** and add the client domain.
5. Smoke-test: register, open the emailed link, sign in, upload an avatar, then invite a user.

Notes:
- Rate limiting uses in-memory counters, so each warm serverless instance counts separately. For strict limits across instances, plug a Redis store (for example Upstash) into `express-rate-limit`.
- If you call the API cross-origin instead of through the rewrite, set `COOKIE_SAMESITE=none` (this forces `Secure`), set `VITE_API_URL` to the full API URL, and add the client origin to `CLIENT_URL`/`CORS_ORIGINS`.

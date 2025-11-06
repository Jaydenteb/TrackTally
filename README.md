# TrackTally – Behaviour Incident Logger

TrackTally is a Next.js 15 PWA that records classroom behaviour incidents directly into Google Sheets. It is optimised for mobile, works offline, and now includes a Google Workspace–protected admin console for managing classes, teachers, and student rosters.

## Features

- Fast logger UI with bulk student selection, quick level/category chips, and speech-to-text notes.
- Offline queueing (IndexedDB) with automatic retries once connectivity returns.
- Admin dashboard: create/archive classes, seed/import rosters (CSV with manual column mapping), assign homeroom & specialist staff, manage teacher access, and edit/move/deactivate students.
- Google Workspace authentication (NextAuth) with precise role control; teacher view pulls live rosters from Prisma.
- Service worker PWA shell (disabled in dev to avoid stale caches) and `/api/health` uptime check.
- Optional SMTP notifications when incidents target students from another class (emails the homeroom teacher).
- Incident audit log stored in the database (and still appended to Google Sheets) to enable analytics and reliable history.

## Project structure

```
behaviour-logger
├─ app
│  ├─ admin/page.tsx                  # Admin dashboard wrapper (server component)
│  ├─ api
│  │  ├─ auth/[...nextauth]/route.ts  # NextAuth handlers (Node runtime)
│  │  ├─ health/route.ts              # Health endpoint
│  │  ├─ log-incident/route.ts        # Google Sheets append API
│  │  ├─ roster/route.ts              # Teacher roster feed (Prisma)
│  │  └─ admin/...                    # CRUD APIs (classes, teachers, students, seed, import)
│  ├─ login/page.tsx                  # Google sign-in screen
│  ├─ teacher/page.tsx                # Admin shortcut into the logger
│  ├─ layout.tsx                      # Root layout with SessionProvider + SW register
│  └─ page.tsx                        # Teacher logger (client)
├─ components
│  ├─ LoggerApp.tsx                   # Incident logger UI
│  └─ admin/                          # Admin dashboard client modules
├─ lib/                               # Prisma client, admin guard, Sheets helper, IndexedDB, Speech
├─ prisma/
│  ├─ schema.prisma                   # SQLite schema (Teacher/Classroom/TeacherClass/Student)
│  └─ tracktally.db                   # Local DB (gitignored)
├─ public/manifest.json               # PWA manifest
├─ auth.ts                            # NextAuth configuration (ensures teachers exist in Prisma)
├─ middleware.ts                      # Route guard (admin/teacher)
├─ .env.example                       # Env template
├─ .gitignore                         # Includes SQLite DB + Next/Node modules
└─ README.md
```

## Environment setup

1. Create a dedicated Google Cloud project for TrackTally (outside any school Workspace). Enable the Google Sheets API, create a service account, and share your incident sheet with that account. In the same project, create an OAuth 2.0 Client ID of type **Web application**.
2. Copy `.env.example` to `.env.local` and populate the variables:

| Variable | Purpose |
|----------|---------|
| `SHEET_ID` | Google Sheet ID that will store incident rows. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Credentials for the service account that can write to the sheet (keep literal `\n` in the private key). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth client created in the same Google Cloud project. |
| `NEXTAUTH_SECRET` | Random base64 string (`openssl rand -base64 32`). |
| `ALLOWED_GOOGLE_DOMAIN` | Optional: restrict sign-in to a single domain. Leave blank for public access. |
| `ADMIN_EMAILS` | Comma-separated list of addresses to auto-provision as admins on first login. |
| `DATABASE_URL` | `file:./prisma/tracktally.db` for local dev; point to your managed database in staging/production. |
| `NEXTAUTH_URL` | Public base URL used for OAuth callbacks (e.g. your named Cloudflare tunnel or production domain). |
| `SMTP_*` | Optional SMTP credentials for incident notification emails. |

3. Install dependencies and prepare Prisma:

```bash
npm install
npx prisma migrate dev --name init   # creates prisma/tracktally.db
npx prisma generate                  # regenerates @prisma/client (stop dev server first if locked)
```

4. Run `npm run dev`. After authenticating with Google you will land in the teacher logger (admins can browse to `/admin`).
## Google Sheets

1. Create **Behaviour Logs** sheet, tab **Incidents**, header row (A1–L1):
   `timestamp,studentId,studentName,level,category,location,actionTaken,note,teacherEmail,classCode,device,uuid`
2. Enable Google Sheets API, create a Service Account, share sheet with that account.
3. Paste credentials into `.env.local` (keep newline escape sequences).

## Admin dashboard

- **Classes**: create/archive, assign homeroom teachers, add specialists, import CSV or “Add sample students”.
- **Teachers & Staff**: provision email, set role (teacher/admin), toggle specialist, assign classes, activate/deactivate.
- **Students**: edit names/IDs/notes/guardians, reassign classes, mark active/inactive.
- CSV import now prompts you to map columns (studentId, firstName, lastName, optional guardians) before uploading.
- **Incidents**: new viewer shows the latest entries (from the DB) with basic details; Sheets remains the flat-file source for exports.

## Teacher logger

- Fetches rosters via `/api/roster` (admins see all classes; teachers see assigned ones). Quick-find jumps across classes without reloading.
- Offline queue stores failed submissions; mic button uses Web Speech API (en-AU).
- Admin link appears in header for quick return to `/admin`.

## Testing checklist

1. Sign in using an approved Workspace account (others should be rejected).
2. Log an incident → expect “Logged” toast + row in Google Sheets.
3. Test offline submission → entry queued, auto-flush on reconnect.
4. Try mic dictation (iOS Safari / Chrome).
5. Switch classes via quick-find and verify roster persists.
6. Admin tasks: create class, seed sample students, import CSV, assign teachers, edit/move students.
7. `GET /api/health` → `{ "ok": true }`.

## Implementation notes

- `lib/prisma.ts` caches Prisma client in dev; NextAuth callbacks use Prisma to ensure teacher records exist and to read roles (admins bootstrap from `ADMIN_EMAILS`).
- `/api/admin/*` routes call `requireAdmin`, ensuring only admins mutate data.
- Service worker unregistered in dev to avoid stale `_next` assets; prod registers `/sw`.
- Logger handles network errors gracefully, displaying toast feedback without crashing.
- `lib/mailer.ts` sends optional notification emails via SMTP when incidents involve students from another class (skips automatically if SMTP env vars are missing).
- `/api/log-incident` upserts each incident into the DB first (idempotent on `uuid`), then appends to Sheets. If DB write fails, it continues to Sheets.
- Planned contract change: the client will stop sending `teacherEmail`; the server will derive it from the authenticated session to prevent spoofing and simplify the client.

## SpellTally platform integration plan

- **Database convergence (Neon Postgres)**  
  - Migrate the Prisma schema from SQLite to Postgres, generate migrations, and run them against a new database in Neon.  
  - Create migration scripts to import existing incidents (if required) and provision read/write roles with least privilege.  
  - Update `DATABASE_URL` secrets (dev/staging/prod) to point at the respective Neon branches.

- **Shared authentication (Google via NextAuth)**  
  - Reuse or clone the Google OAuth client from SpellTally’s Google Cloud project; add TrackTally domains to authorized origins/redirects.  
  - Align admin/teacher provisioning with your existing directory or invite flow, centralizing `ADMIN_EMAILS` (or replacing it with DB-backed role management).  
  - Configure secret storage so both apps pull their Google credentials from the same secure vault.

- **Deployment on Vercel**  
  - Create a TrackTally project within the SpellTally Vercel org (staging + production).  
  - Inject shared environment variables (Neon connection strings, Google creds, service account key, SMTP) via Vercel environment management.  
  - Hook CI to trigger Vercel builds and, if desired, attach preview deployments to temporary Neon branches + OAuth redirects.

- **Observability & ops alignment**  
  - Plug TrackTally into the same logging/error monitoring stack (e.g. Sentry, Logflare, Datadog) and add service checks to your incident response workflow.  
  - Document shared runbooks covering secret rotation, Google OAuth changes, and database maintenance so engineers understand the combined footprint.

## Security-First Roadmap (Next)

- **Server-derived teacher identity**
  - Remove `teacherEmail` from client payload; derive from the authenticated session in `app/api/log-incident/route.ts`.
  - Enforce role check (teacher/admin) and reject unauthenticated calls.
  - *Acceptance*: client no longer sends `teacherEmail`; API uses session email and returns 401/403 when appropriate.

- **Input validation and strict contracts**
  - Introduce Zod schemas for API bodies with max lengths and enums for level/category/location while keeping the 10 KB cap.
  - Centralise sanitisation (trimming and HTML stripping).
  - *Acceptance*: invalid payloads return 400 with clear errors; all routes validate via schema.

- **Rate limiting and abuse protection**
  - Add per-IP and per-user rate limits on `/api/log-incident` and all `/api/admin/*` routes.
  - Return 429 with `Retry-After`. Use an in-memory limiter for dev and Redis/Upstash in production.
  - *Acceptance*: rapid-fire requests are throttled; limit headers expose limit/remaining.

- **Security headers and cookies**
  - Enforce HSTS, `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'`, and a minimal CSP (`self` plus required fonts).
  - Ensure cookies are secure, `SameSite=lax`; set `NEXTAUTH_URL` in production and enforce HTTPS.
  - *Acceptance*: headers present on all responses; cookies are secure/lax in production.

- **Access control hardening**
  - Verify Google Workspace domain via both the NextAuth `hd` claim and email suffix.
  - Keep middleware guard for `/admin/*` and add server-side rechecks inside admin APIs.
  - *Acceptance*: non-domain users cannot sign in; non-admins cannot access admin APIs even if called directly.

- **Secrets and environment hygiene**
  - Rotate the Google service account key; store secrets only in deployment env vars.
  - Add boot-time checks to refuse startup with missing/malformed credentials; ensure no secrets are logged.
  - *Acceptance*: app refuses to start without required envs; logs stay free of secrets.

- **Data governance**
  - Add retention controls for incidents (DB) with scheduled purge; provide on-demand CSV export with an audit entry for the export action.
  - *Acceptance*: exports produce CSVs and log an audit record; retention purges old rows automatically.

- **Observability and alerts**
  - Integrate Sentry (server/client) with PII redaction.
  - Alert on Sheets API 4xx/5xx bursts and authentication failures.
  - *Acceptance*: errors visible in Sentry; alerts fire on configured thresholds.

## UX Enhancements (Next)

- **Faster mic**
  - Long-press in the Note area to start dictation and stop on release to remove an extra tap.
  - *Acceptance*: press-and-hold starts mic, release stops on iOS Safari and Chrome, text appears in the note.

- **Keyboard/gesture polish**
  - Let Enter submit on the final step, support swipe left/right between steps, and ensure focus lands on the next key control.
  - *Acceptance*: Enter submits on the last step; swipes navigate steps; focus/ARIA states remain correct.

# TrackTally – Behaviour Incident Logger

TrackTally is a Next.js 15 PWA that records classroom behaviour incidents directly into Google Sheets. It is optimised for mobile, works offline, and now includes a Google Workspace–protected admin console for managing classes, teachers, and student rosters.

**Current Status**: ✅ **Ready for Demo & Testing** (1-2 schools, January 2025)

## Features

- Fast logger UI with bulk student selection, quick level/category chips, and speech-to-text notes.
- Offline queueing (IndexedDB) with automatic retries once connectivity returns.
- Admin dashboard: create/archive classes, seed/import rosters (CSV with manual column mapping), assign homeroom & specialist staff, manage teacher access, and edit/move/deactivate students.
- Google Workspace authentication (NextAuth) with precise role control; teacher view pulls live rosters from Prisma.
- Service worker PWA shell (disabled in dev to avoid stale caches) and `/api/health` uptime check.
- Optional SMTP notifications when incidents target students from another class (emails the homeroom teacher).
- Incident audit log stored in the database (and still appended to Google Sheets) to enable analytics and reliable history.
- Customisable incident options per school (levels, categories, locations, actions) managed by admins and overseen by a global Super Admin.
- Multi-tenant isolation: each school is backed by its own `Organization` record in Postgres, and every class/teacher/student/incident row is scoped to that organization. Super Admins can impersonate a school's admin console without leaking data across schools.

## Recent Updates (January 2025)

### ✅ Pre-Production Security & Stability Fixes Completed
- **Domain Authorization**: Fixed security issue where missing `ALLOWED_GOOGLE_DOMAIN` allowed any Google account (now fails closed)
- **Mobile Auth Cleanup**: Automated cron job to prune expired mobile auth tickets (runs daily at 2 AM)
- **Test Suite**: Added Vitest with critical path tests for multi-tenant isolation, auth flows, and incident validation
- **Audit Logging**: Implemented audit trail for admin actions (create/update students, classrooms, teachers)
- **Error Boundaries**: Added React error boundaries to prevent app crashes during testing
- **Backup Documentation**: Comprehensive backup/restore procedures documented in `docs/ops/backup-restore.md`

**See**: `IMPLEMENTATION-SUMMARY.md` for complete implementation details and testing checklist.

## Priority: Super Admin & Multi‑Tenant Auth

We are preparing TrackTally for multiple schools and future individual licences. The immediate focus is enabling a Super Admin experience and multi‑tenant authentication while keeping mobile sign‑in excellent.

- Deliverables
  - Super Admin console (`/super-admin`) to manage organizations (schools), domains, seats/licences, and admins.
  - Data model: `Organization`, `OrgDomain` (DNS‑verified), `OrgMember` (role: `super_admin`, `org_admin`, `teacher`), and `License` (plan, seats, status, dates).
  - Domain verification flow: generate a DNS TXT token, poll/verify, then allow sign‑ins from that domain.
  - Auth changes: NextAuth sign‑in checks allowed domains from `OrgDomain` instead of a single `ALLOWED_GOOGLE_DOMAIN` (kept as single‑tenant fallback).
  - Mobile‑first Google sign‑in page (already in place) with clear domain messaging and fast path back to the logger.

- Configuration (target state)
  - `NEXTAUTH_URL` set per env (dev/staging/prod) to your public hostname.
  - Google OAuth client with authorized redirect URIs for each env (see below). One GCP project is fine; create a distinct OAuth client for TrackTally to keep callbacks tidy.
  - Optional SMTP (or Resend SMTP/API) for incident notifications remains unchanged.

- Implementation phases
  1) Schema: add `Organization`, `OrgDomain`, `OrgMember`, `License`; migrate DB; seed your first org.
  2) Auth guard: load allowed domains at sign‑in; block non‑verified domains; keep `ALLOWED_GOOGLE_DOMAIN` honored when set.
  3) Console: `/super-admin` UI for org CRUD, domain verification (TXT token), member roles, and seat counts.
  4) Licensing: enforce seat limits (soft first), add basic audit events; Stripe/Billing later.

- Acceptance
  - Super Admin can add a school, provide a domain, verify via DNS TXT, invite admins, and see active users.
  - Teachers from verified domains can sign in and reach `/teacher`; others are blocked with a clear message.

### OAuth Redirect URIs (examples)

Add these under your Google OAuth client for TrackTally (adjust hostnames you choose):

- Dev: `http://localhost:3000/api/auth/callback/google`
- Staging: `https://tracktally-staging.<your-domain>/api/auth/callback/google`
- Prod: `https://tracktally.<your-domain>/api/auth/callback/google`

Set `NEXTAUTH_URL` to the exact base URL of each environment.

### Domain Strategy (suite of apps)

You have two pragmatic paths:

1) Short‑term (simple): run TrackTally at a subdomain of your existing brand, e.g. `tracktally.spelltally.com`. Give TrackTally its own OAuth client (within the same Google Cloud project) and its own `NEXTAUTH_URL`. This keeps cost/ops low and can migrate later.
2) Long‑term (scales best): use a parent brand domain (e.g. `tally.education`) with product subdomains: `tracktally.tally.education`, `spelltally.tally.education`, and optionally `id.tally.education` for future cross‑app SSO. Each app keeps distinct OAuth clients and envs; the identity subdomain can unify sign‑in later.

Recommendation: adopt option 1 now for speed; plan option 2 as you add more apps or need cross‑product SSO.

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
| `DATABASE_URL` | Prisma Client connection. Use the Neon **pooler** host with `?sslmode=require&pgbouncer=true` in staging/production so prepared statements are disabled. |
| `DIRECT_DATABASE_URL` | Owner connection (non-pooled) that Prisma Migrate uses via `directUrl` to run migrations safely. |
| `SHADOW_DATABASE_URL` | Owner connection to a dedicated `*_shadow` database used by `prisma migrate dev`. |
| `NEXTAUTH_URL` | Public base URL used for OAuth callbacks (e.g. your named Cloudflare tunnel or production domain). |
| `SMTP_*` | Optional SMTP credentials for incident notification emails. |

3. Install dependencies and prepare Prisma:

```bash
npm install
npx prisma migrate dev --name init   # creates migrations
npx prisma generate                  # regenerates @prisma/client (stop dev server first if locked)
```

4. Run tests (optional but recommended):

```bash
npm test              # Run all tests
npm run test:ui       # Run with visual UI
npm run test:coverage # Generate coverage report
```

5. Run `npm run dev`. After authenticating with Google you will land in the teacher logger (admins can browse to `/admin`).

### Important: First-Time Setup

After first deployment, you MUST create an organization and assign users:

1. **Add yourself as super admin** (in Vercel env vars):
   ```
   SUPER_ADMIN_EMAILS=your-email@domain.com
   ```

2. **Set domain restriction** (recommended):
   ```
   ALLOWED_GOOGLE_DOMAIN=yourdomain.edu
   ```

3. **Create your first organization**:
   - Sign in and go to `/super-admin`
   - Click "Create Organization"
   - Enter school name and email domain (e.g., "yourdomain.edu")
   - This enables teachers from that domain to sign in

4. **Sign out and sign back in** - Your account will auto-assign to the new organization

5. **Verify cron jobs** - Check Vercel dashboard for scheduled cleanup job

**Important**: Teachers cannot log incidents until they are assigned to an organization. Either:
- Create organization matching their email domain, OR
- Add them to `SUPER_ADMIN_EMAILS` for testing (they can then create orgs)
## Google Sheets

1. Create **Behaviour Logs** sheet, tab **Incidents**, header row (A1–L1):
   `timestamp,studentId,studentName,level,category,location,actionTaken,note,teacherEmail,classCode,device,uuid`
2. Enable Google Sheets API, create a Service Account, share sheet with that account.
3. Paste credentials into `.env.local` (keep newline escape sequences).

## Admin dashboard

- **Classes**: create/archive, assign homeroom teachers, add specialists, import CSV rosters.
- **Teachers & Staff**: provision email, set role (teacher/admin), toggle specialist, assign classes, activate/deactivate.
- **Students**: edit names/IDs/notes/guardians, reassign classes, mark active/inactive.
- **Data hygiene**: one-click “Remove sample data” button deletes the legacy Bluegum/Koalas classes and S9001–S9010 students for the current school.
- CSV import now prompts you to map columns (studentId, firstName, lastName, optional guardians) before uploading.
- **Incidents**: new viewer shows the latest entries (from the DB) with basic details; Sheets remains the flat-file source for exports.

## Teacher logger

- Fetches rosters via `/api/roster` (admins see all classes; teachers see assigned ones). Quick-find jumps across classes without reloading.
- Offline queue stores failed submissions; mic button uses Web Speech API (en-AU).
- Admin link appears in header for quick return to `/admin`.
- Shows the active school name/domain beside the logger so teachers know which organization they’re operating in.

## Testing checklist

### Pre-Deployment Verification
1. Run `npm test` - All tests pass
2. Run `npm run build` - Builds without errors
3. Verify `vercel.json` exists (cron configuration)
4. Check all required env vars set in Vercel

### After Deployment
1. Verify cron job scheduled in Vercel dashboard
2. Sign in using an approved Workspace account (others should be rejected)
3. Create organization via `/super-admin` if not exists
4. Sign out and back in to get organization assigned

### Functional Testing
1. Log an incident → expect "Logged" toast + row in Google Sheets
2. Test offline submission → entry queued, auto-flush on reconnect
3. Try mic dictation (iOS Safari / Chrome)
4. Switch classes via quick-find and verify roster persists
5. Admin tasks: create class, import CSV, assign teachers, edit/move students
6. Verify audit logs created: `SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 10;`
7. Test error boundary: Intentionally trigger error, verify friendly message shown
8. `GET /api/health` → `{ "ok": true }`

### PWA Testing (Mobile Demo)
1. **iOS Safari**: Add to Home Screen, verify app icon appears
2. **Android Chrome**: Install app, verify in app drawer
3. **Offline mode**: Turn off wifi, log incident, verify queued
4. **Online sync**: Turn wifi on, verify queued incident uploads
5. **Performance**: Time how fast to log one incident (target: <30 seconds)

### Multi-Tenant Isolation Testing
1. Create 2 test organizations with different domains
2. Create test users for each organization
3. Verify School A teacher cannot see School B's:
   - Incidents
   - Students
   - Classrooms
   - Teachers
4. Verify super admin can see both (when impersonating)

## Implementation notes

- `lib/prisma.ts` caches Prisma client in dev; NextAuth callbacks use Prisma to ensure teacher records exist and to read roles (admins bootstrap from `ADMIN_EMAILS`).
- `/api/admin/*` routes call `requireAdmin`, ensuring only admins mutate data.
- **Security**: Domain authorization now fails closed - if `ALLOWED_GOOGLE_DOMAIN` is not set, sign-ins are rejected (changed Jan 2025).
- **Audit logging**: Admin actions logged to `AuditLog` table via `lib/audit.ts` utility.
- **Error handling**: Error boundaries wrap app in `app/layout.tsx` to prevent crashes from uncaught React errors.
- **Cron jobs**: Mobile auth ticket cleanup runs daily at 2 AM via Vercel Cron (see `vercel.json`).
- Service worker unregistered in dev to avoid stale `_next` assets; prod registers `/sw`.
- Logger handles network errors gracefully, displaying toast feedback without crashing.
- `lib/mailer.ts` sends optional notification emails via SMTP when incidents involve students from another class (skips automatically if SMTP env vars are missing).
- `/api/log-incident` upserts each incident into the DB first (idempotent on `uuid`), then appends to Sheets. If DB write fails, it continues to Sheets.
- **Organization requirement**: All teachers/admins must have an `organizationId` assigned to log incidents or access admin routes (403 Forbidden if missing).

## SpellTally platform integration plan

- **Database convergence (Neon Postgres)**  
  - Migrate the Prisma schema from SQLite to Postgres, generate migrations, and run them against a new database in Neon.  
  - Create migration scripts to import existing incidents (if required) and provision read/write roles with least privilege.  
  - Update the three Prisma URLs (`DATABASE_URL` pooler for the app, `DIRECT_DATABASE_URL` owner direct connection, `SHADOW_DATABASE_URL` for migrate dev) per environment/branch.

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

---

## Code Review Recommendations & Future Actions

Based on a comprehensive code review conducted January 2025, the following actions are prioritized to improve security, scalability, and maintainability.

### 🎯 IMMEDIATE ACTIONS (Pre-Testing Phase with 1-2 Schools)

**Current Context**: Pre-production testing with 1-2 schools starting next year. Focus on critical security and stability fixes only.

**Must Fix Before ANY Testing (Total: ~18-20 hours)**

1. **Fix Domain Authorization Default** - **1 hour** - CRITICAL SECURITY
   - **File**: `auth.ts:28` (isAllowedDomain function)
   - **Issue**: Currently allows ANY Google account if `ALLOWED_GOOGLE_DOMAIN` is unset
   - **Risk**: Unauthorized users could access the system
   - **Fix**: Change line 28 from `if (!normalizedDomain) return true;` to `if (!normalizedDomain) return false;`
   - **Test**: Verify sign-in blocked when env var missing

2. **Implement Mobile Auth Ticket Cleanup** - **2-3 hours** - PREVENTS DB BLOAT
   - **File**: Create `app/api/cron/cleanup/route.ts`
   - **Issue**: Expired tickets accumulate indefinitely
   - **Fix**:
     ```typescript
     import { pruneExpiredTickets } from '@/lib/mobile-auth';
     export async function GET() {
       await pruneExpiredTickets();
       return Response.json({ ok: true });
     }
     ```
   - **Configure**: Add to `vercel.json`:
     ```json
     {
       "crons": [{
         "path": "/api/cron/cleanup",
         "schedule": "0 2 * * *"
       }]
     }
     ```

3. **Add Critical Path Tests** - **8 hours** - ENSURES DATA ISOLATION
   - **Setup**: Vitest + React Testing Library
   - **Priority Tests**:
     - Multi-tenant isolation (School A can't see School B incidents)
     - Auth domain validation
     - Incident creation and retrieval
   - **Files**: Create `__tests__/auth.test.ts`, `__tests__/incidents.test.ts`, `__tests__/organizations.test.ts`
   - **Why**: Manual testing won't catch data leakage between organizations

4. **Add Audit Logging** - **4 hours** - TROUBLESHOOTING & ACCOUNTABILITY
   - **Files**: All `app/api/admin/*` routes
   - **Add**: Simple audit trail for admin actions
   - **Example**:
     ```typescript
     await prisma.auditLog.create({
       data: {
         action: 'CREATE_STUDENT',
         performedBy: session.user.email,
         meta: JSON.stringify({ studentId, classroomId })
       }
     });
     ```

5. **Add React Error Boundaries** - **3 hours** - PREVENTS APP CRASHES
   - **Files**: `app/layout.tsx`, `components/LoggerApp.tsx`
   - **Why**: Unhandled errors will crash entire app during testing
   - **Fallback**: Show friendly error message instead of blank screen

**Timeline**: Complete items 1-5 within 2-3 days before any school testing begins.

---

### 📅 PHASED ROLLOUT PLAN (1-2 Schools)

**Phase 0: Pre-Testing (NOW - Before Schools Start)**
- Complete 5 immediate actions above
- Set up Sentry DSN and verify error tracking
- Document backup/restore procedure
- **Ready for**: Internal testing and first school onboarding

**Phase 1: Initial Testing (First 3 Months)**
- Monitor error rates and performance in Sentry
- Gather feedback on UX and workflows
- Watch for edge cases in multi-tenant isolation
- **Defer**: Scalability fixes (pagination, rate limiting, N+1 queries)
- **Why**: 1-2 schools won't hit these limits (< 10K incidents, < 50 concurrent users)

**Phase 2: Expanding to 5-10 Schools (Months 4-6)**
- Add items 7, 11, 24 (Pagination, Ticket cleanup confirmed working, DB pooling)
- Implement item 2 (CSRF protection)
- Set up CI/CD pipeline (item 10)
- **When to start**: Once you have 3+ schools committed

**Phase 3: Scaling to 20+ Schools (Months 7-12)**
- Implement distributed rate limiting (item 1)
- Fix N+1 queries (not in main list but identified in scalability review)
- Add caching layer (item 17)
- Optimize Sheets integration (item 22)
- **When to start**: When incident exports start timing out or Sheets API hits quota

**Phase 4: Production at Scale (Year 2)**
- Complete all remaining security, code quality, and monitoring items
- Migrate to stable dependencies when available
- Add comprehensive E2E testing

---

### 🔒 SECURITY CHECKLIST FOR 1-2 SCHOOLS

**Before First School Onboarding:**
- [x] Security headers configured (already done in `next.config.mjs`)
- [x] Sentry PII scrubbing enabled (already done in `sentry.server.config.ts`)
- [ ] Fix domain authorization default (item 1 above)
- [ ] Set `ALLOWED_GOOGLE_DOMAIN` in production env vars
- [ ] Verify organization data isolation with tests (item 3 above)
- [ ] Add audit logging (item 4 above)
- [ ] Document incident response procedure

**Nice to Have (But Not Blocking):**
- CSRF protection (defer to Phase 2)
- API versioning (defer to Phase 3)
- Comprehensive rate limiting (current in-memory is fine for 2 schools)

---

### 📊 CAPACITY LIMITS (Current Architecture)

**What Works Fine for 1-2 Schools:**
- ✅ In-memory rate limiting (single server deployment)
- ✅ No pagination (< 10K incidents, < 200 students per school)
- ✅ Synchronous Sheets appends (< 10 concurrent teachers)
- ✅ N+1 queries in roster (< 20 classrooms per teacher)
- ✅ CSV imports without batching (< 1K row files)
- ✅ No distributed caching

**When You'll Hit Limits:**
- Incidents Export: ~50K+ incidents (Year 2+)
- Rate Limiting: 5+ schools with load balancing
- Google Sheets: 100+ concurrent writes/min
- Roster Performance: 50+ classrooms per teacher
- CSV Imports: 10K+ row files

**Recommendation**: Don't optimize prematurely. Your current architecture is fine for 1-2 schools.

---

## Troubleshooting

### 403 Forbidden on /api/log-incident
**Cause**: User's `organizationId` is null
**Fix**: Either:
1. Add user to `SUPER_ADMIN_EMAILS` (bypasses org requirement), OR
2. Create organization matching user's email domain via `/super-admin`, then sign out/in

### Admin routes returning 403
**Cause**: User role is not "admin" or "superadmin"
**Fix**: Add email to `ADMIN_EMAILS` or `SUPER_ADMIN_EMAILS` env var, redeploy, sign out/in

### Incidents not appearing in Sheets
**Cause**: Missing or incorrect Sheets credentials
**Fix**: Verify `SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are set correctly

### PWA not installing on iOS
**Cause**: Must use Safari browser (not Chrome)
**Fix**: Open in Safari, use Share → Add to Home Screen

### Offline queue not syncing
**Cause**: IndexedDB not available or service worker issues
**Fix**: Check browser console for errors, ensure HTTPS (required for service workers)

### Tests failing
**Cause**: Dependencies not installed or Prisma not generated
**Fix**: Run `npm install` and `npx prisma generate`, then `npm test`

---

### 📚 COMPLETE ROADMAP (For Future Reference)

The following items are catalogued for future phases as your deployment scales. **These are NOT needed for initial 1-2 school testing.**

#### CRITICAL (Fix Before Production at Scale) 🔥

1. **Replace In-Memory Rate Limiter** - **DEFER TO PHASE 3**
   - **Issue**: Current rate limiter (`lib/rate-limit.ts`) uses in-memory Map, won't work across multiple server instances
   - **Impact**: Attackers can bypass rate limits by hitting different servers in distributed deployment
   - **Action**: Migrate to Redis-based rate limiting (Upstash Redis, Vercel KV, or similar)
   - **Files**: `lib/rate-limit.ts`, all API routes using `rateLimit()`
   - **Estimated Effort**: 4-6 hours

2. **Add CSRF Protection** - **DEFER TO PHASE 2**
   - **Issue**: Custom API routes lack CSRF tokens; only NextAuth routes are protected
   - **Impact**: Cross-site request forgery attacks possible on state-changing operations
   - **Action**: Implement CSRF middleware or use NextAuth's CSRF protection for all API routes
   - **Files**: `middleware.ts`, all POST/PUT/DELETE routes
   - **Estimated Effort**: 3-4 hours
   - **Why Deferred**: Low risk with small controlled user base; Google OAuth provides some protection

3. **Add Global Request Size Limits** - **DEFER TO PHASE 2**
   - **Issue**: Only `/api/log-incident` has 10KB limit; other routes accept unlimited payloads
   - **Impact**: DoS attacks via large request bodies
   - **Action**: Add global middleware for request size limits or per-route validation
   - **Files**: `middleware.ts`, Next.js config
   - **Estimated Effort**: 2-3 hours
   - **Why Deferred**: Low risk with trusted users; Vercel has default limits

#### HIGH PRIORITY (For Scaling Beyond 5 Schools) ⚠️

4. **Add API Pagination** - **DEFER TO PHASE 2**
   - **Issue**: `/api/admin/students` and `/api/admin/classes` return all records
   - **Impact**: Timeouts and performance issues with 1000+ records
   - **Action**: Implement cursor-based or offset pagination with configurable page size
   - **Files**: `app/api/admin/students/route.ts`, `app/api/admin/classes/route.ts`
   - **Estimated Effort**: 4-6 hours
   - **When Needed**: >1000 students or >50K incidents

5. **Decide on Single Source of Truth** - **DEFER TO PHASE 3**
   - **Issue**: Incidents written to both DB and Google Sheets; DB failures ignored
   - **Impact**: Data inconsistency, hard to troubleshoot
   - **Action**: Make PostgreSQL the primary source, export to Sheets periodically or on-demand
   - **Files**: `app/api/log-incident/route.ts`, `lib/sheets.ts`
   - **Estimated Effort**: 8-12 hours (includes data migration plan)
   - **When Needed**: When you need better data consistency guarantees

6. **Set Up CI/CD Pipeline** - **DEFER TO PHASE 2**
    - **Issue**: No automated checks on pull requests
    - **Action**: GitHub Actions workflow for:
      - TypeScript type checking
      - ESLint
      - Run tests (when added)
      - Build verification
      - Prisma migration checks
    - **Files**: Create `.github/workflows/ci.yml`
    - **Estimated Effort**: 3-4 hours
    - **When Needed**: Once you have regular code changes from multiple developers

#### MEDIUM PRIORITY (Technical Debt) 📋

7. **Refactor Large Components** - **DEFER TO PHASE 3**
    - **Issue**: `LoggerApp.tsx` likely 500+ lines; difficult to maintain
    - **Action**: Split into smaller components (StudentPicker, IncidentForm, OfflineQueueManager)
    - **Files**: `components/LoggerApp.tsx`
    - **Estimated Effort**: 8-12 hours

8. **Add JSDoc Documentation** - **ONGOING**
    - **Issue**: Complex functions lack documentation
    - **Action**: Add JSDoc comments for public APIs and business logic as you modify code
    - **Priority Functions**: `ensureTeacher`, `resolveOrganizationIdForRequest`, `flushQueue`, rate limiting
    - **Estimated Effort**: 6-8 hours

9. **Plan Stable Dependency Migration** - **Q1-Q2 2025**
    - **Issue**: Using Next.js 15 canary, React 19 RC, NextAuth beta
    - **Action**: Monitor release channels, test with stable versions when available
    - **Timeline**: Q1-Q2 2025 (when Next.js 15 and React 19 stable)
    - **Estimated Effort**: 8-16 hours (testing + bug fixes)

10. **Add Request Validation Middleware** - **DEFER TO PHASE 3**
    - **Issue**: Every route manually calls `requireAdmin()`, repetitive code
    - **Action**: Create higher-order function or middleware wrapper for common patterns
    - **Files**: Create `lib/api-middleware.ts`, refactor all API routes
    - **Estimated Effort**: 6-8 hours

11. **Implement Caching Layer** - **DEFER TO PHASE 3**
    - **Issue**: Rosters and options fetched on every request
    - **Action**: Cache in Redis with TTL or use SWR/React Query on client
    - **Files**: `app/api/roster/route.ts`, `app/api/options/route.ts`, frontend components
    - **Estimated Effort**: 6-10 hours
    - **When Needed**: >10 schools with frequent roster access

12. **Version Critical API Endpoints** - **DEFER TO PHASE 3**
    - **Issue**: No API versioning; breaking changes will break mobile apps
    - **Action**: Prefix critical endpoints with `/api/v1/` and maintain backward compatibility
    - **Files**: All API routes, update mobile app to use versioned endpoints
    - **Estimated Effort**: 4-6 hours
    - **When Needed**: Before making breaking changes to mobile API

#### LOW PRIORITY (Nice to Have) ✨

13. **Add Soft Deletes** - **DEFER TO PHASE 4**
    - **Issue**: Hard deletes for students/classrooms could orphan incidents
    - **Action**: Add `deletedAt` timestamp fields, filter out soft-deleted records
    - **Files**: `prisma/schema.prisma`, all Prisma queries
    - **Estimated Effort**: 8-12 hours (schema + migration + query updates)

14. **Replace Console Logging** - **DEFER TO PHASE 4**
    - **Issue**: 34 instances of `console.log/error/warn` in production code
    - **Action**: Use structured logging library (Pino, Winston) with log levels
    - **Files**: All files using console.*
    - **Estimated Effort**: 4-6 hours

15. **Document Migration Rollback Procedures** - **PHASE 1**
    - **Issue**: No documented rollback strategy for database migrations
    - **Action**: Create runbook for each migration with rollback SQL scripts
    - **Files**: Create `docs/ops/backup-restore.md`
    - **Estimated Effort**: 3-4 hours

16. **Optimize Google Sheets Integration** - **DEFER TO PHASE 3**
    - **Issue**: Linear append will slow at 10,000+ rows
    - **Action**: Implement batch writes, automatic archiving, or BigQuery export
    - **Files**: `lib/sheets.ts`
    - **Estimated Effort**: 8-12 hours
    - **When Needed**: >10K incidents per school

#### Environment & Infrastructure

17. **Add Environment Variable Validation** - **PHASE 2**
    - **Action**: Use Zod or envalid to validate all required env vars at startup
    - **Files**: Create `lib/env.ts`, import in `auth.ts` and main entry points
    - **Estimated Effort**: 2-3 hours

18. **Set Up Database Connection Pooling** - **PHASE 2**
    - **Issue**: No explicit connection pool configuration
    - **Action**: Add Prisma pool settings (`connection_limit`, `pool_timeout`)
    - **Files**: `lib/prisma.ts`
    - **Estimated Effort**: 1-2 hours

19. **Implement Health Check Endpoint** - **PHASE 1 (SIMPLE VERSION)**
    - **Action**: Expand `/api/health` to check DB connection, Sheets API, auth status
    - **Files**: `app/api/health/route.ts`
    - **Estimated Effort**: 2-3 hours

20. **Document Backup & Restore Procedures** - **PHASE 0 (IMMEDIATE)**
    - **Action**: Document Neon backup strategy, test restore procedure
    - **Files**: Create `docs/ops/backup-restore.md`
    - **Estimated Effort**: 2-3 hours
    - **Critical**: Must have before any production data

#### Monitoring & Observability

21. **Configure Sentry Properly** - **ALREADY DONE ✅**
    - Sentry DSN, PII scrubbing, error sampling already configured
    - Just need to add DSN to production environment variables

22. **Add Performance Monitoring** - **PHASE 2**
    - **Action**: Track API response times, database query performance, incident logging success rate
    - **Tools**: Sentry Performance, Vercel Analytics, or custom metrics
    - **Estimated Effort**: 4-6 hours

23. **Set Up Alerting** - **PHASE 1**
    - **Action**: Configure alerts for:
      - Authentication failures spike
      - Sheets API errors
      - Database connection failures
      - High error rates
    - **Estimated Effort**: 3-4 hours
    - **Tool**: Use Sentry alerts (already integrated)

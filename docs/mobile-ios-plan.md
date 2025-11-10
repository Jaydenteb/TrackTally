# TrackTally iOS Wrapper & TestFlight Guide

This guide walks you from the current Next.js PWA to a native iOS build with private TestFlight distribution. Follow the steps in order; each section lists the files to touch and the commands to run.

---

## 0. Prerequisites

- Active Apple Developer Program account (Individual is OK for now).
- Stable HTTPS host for TrackTally (e.g. `https://tracktally.yourdomain.com`) with `NEXTAUTH_URL` pointing to it and Google OAuth redirect URIs configured.
- Node 18+, PNPM/NPM, Xcode 15+, and CocoaPods installed.
- Google OAuth client for production/staging with the redirect `https://tracktally.yourdomain.com/api/mobile/auth/finish`.

Keep a demo Google account handy for App Review.

---

## 1. Backend: Mobile Auth Ticket Flow

> Status: Implemented in this repo (Nov 2025). Run `npx prisma migrate deploy` in each environment to apply `20251110_add_mobile_auth_ticket`, then you can move straight to Section 2. The notes below are kept for reference.

The iOS wrapper must start Google sign-in in the system browser (ASWebAuthenticationSession), then hand the session back to the embedded WebView. We do this with one-time “tickets”.

### 1.1 Prisma model

File: `prisma/schema.prisma`

```prisma
model MobileAuthTicket {
  id            String   @id @default(cuid())
  state         String   @unique
  transferToken String?  @unique
  redirectPath  String   @default("/teacher")
  sessionToken  String?
  expiresAt     DateTime
  consumedAt    DateTime?
  createdAt     DateTime @default(now())

  @@index([expiresAt])
}
```

Create a migration:

```bash
npx prisma migrate dev --name add_mobile_auth_ticket
```

### 1.2 Server helpers

File: `lib/mobile-auth.ts`

- `MOBILE_AUTH_TOKEN_TTL_MINUTES` (default 5) controls expiry.
- Export helpers:
  - `createTicket({ redirectPath })`
  - `storeSessionToken(state, sessionToken)`
  - `issueTransferToken(state)`
  - `consumeTransferToken(token)` → returns `sessionToken` + `redirectPath`
  - `pruneExpiredTickets()` (called via cron/route later if desired)

### 1.3 Routes

Create `/app/api/mobile/auth` directory with three route handlers:

1. `start/route.ts` (POST)
   - Body: `{ redirectPath?: string }`
   - Validates path (allow `/teacher`, `/admin`, `/super-admin`).
   - Calls `createTicket`.
   - Responds with `{ state, authUrl }`, where `authUrl = ${NEXTAUTH_URL}/mobile-auth?state=...`.

2. `finish/route.ts` (GET)
   - Runs inside the OAuth callback within the system browser.
   - Uses `auth()` from `next-auth` to ensure a session exists.
   - Reads the NextAuth session cookie. On production you’ll receive `__Secure-tracktally.session-token`.
   - Calls `storeSessionToken(state, token)` and `issueTransferToken(state)`.
   - Returns an HTML page with a meta refresh (or JS) redirecting to `tracktally://auth-complete?transfer=<token>`.

3. `session/route.ts` (GET)
   - Called from inside the WebView with `transfer` query param.
   - Calls `consumeTransferToken`.
   - Sets the same session cookie using `cookies().set(...)` (`secure: true`, `sameSite: "lax"`, `path: "/"`).
   - Redirects to the stored `redirectPath`.

Add a lightweight page at `app/mobile-auth/page.tsx` that just renders the NextAuth sign-in UI with the incoming `state`. This is where `authUrl` sends users, so you can show copy like “Finishing sign-in…”.

### 1.4 Environment & security

- Add `MOBILE_AUTH_TOKEN_TTL_MINUTES=5` to `.env.example`.
- Ensure `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and Google envs are present in production.
- Log each ticket event in `AuditLog` (optional but recommended) so you can trace mobile sign-ins.

### 1.5 Testing

1. Run `npm run dev`.
2. `curl -X POST http://localhost:3000/api/mobile/auth/start` and ensure you get `state` + `authUrl`.
3. Visit the `authUrl` manually, sign in, and confirm `/api/mobile/auth/finish` returns the custom scheme link (will fail to open locally—just ensure you see the HTML).
4. Call `/api/mobile/auth/session?transfer=...` in the same browser; you should be logged in automatically and redirected to `/teacher`.

---

## 2. Capacitor Wrapper (Native Shell)

Follow these six mini-steps and you’ll have a working iOS container that loads your deployed TrackTally, launches Google sign-in in the system browser, and feeds native dictation back into the web UI.

### 2.1 Create the project
```bash
npm create @capacitor/app tracktally-mobile
cd tracktally-mobile
npm install
npm install @capacitor/browser @capacitor/preferences @capacitor-community/speech-recognition
npx cap add ios
```

### 2.2 Point the WebView at TrackTally
Edit `capacitor.config.ts`:
```ts
server: {
  url: "https://tracktally.yourdomain.com", // your production or staging host
  cleartext: false,
},
```
- For local testing, temporarily swap `url` for your LAN HTTPS tunnel (ngrok, Cloudflare Tunnel, etc.) while `npm run dev` is running.

### 2.3 Add the native bridge
Create `src/native-bridge.ts`:
```ts
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Browser } from "@capacitor/browser";

const SERVER_BASE = "https://tracktally.yourdomain.com";

function emit(event: string, payload?: unknown) {
  window.dispatchEvent(new CustomEvent("tracktally-native", { detail: { event, payload } }));
}

async function ensureSpeechPermission() {
  const status = await SpeechRecognition.checkPermission();
  if (status.permission !== "granted") await SpeechRecognition.requestPermission();
}

window.TrackTallyNative = {
  async startDictation() {
    if (!Capacitor.isNativePlatform()) return;
    await ensureSpeechPermission();
    SpeechRecognition.addListener("result", (result) =>
      emit("dictationResult", result.matches?.[0]),
    );
    SpeechRecognition.addListener("error", (error) =>
      emit("dictationError", error.message),
    );
    await SpeechRecognition.start({ locale: "en-AU", partialResults: true });
  },
  async stopDictation() {
    await SpeechRecognition.stop();
  },
  async openAuthSession() {
    const res = await fetch(`${SERVER_BASE}/api/mobile/auth/start`, { method: "POST" });
    const data = await res.json();
    await Browser.open({ url: data.authUrl });
  },
};
```
Import it from `src/main.ts`:
```ts
import "./native-bridge";
```

### 2.4 Tell iOS about the mic + custom URL
Edit `ios/App/App/Info.plist`:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Used to capture voice notes in TrackTally.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>Used to convert speech to text for incident notes.</string>
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>tracktally</string>
    </array>
  </dict>
</array>
```

Handle the link in `App/AppDelegate.swift`:
```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
  guard url.scheme == "tracktally",
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
        let token = components.queryItems?.first(where: { $0.name == "transfer" })?.value,
        let target = URL(string: "https://tracktally.yourdomain.com/api/mobile/auth/session?transfer=\(token)") else {
    return false
  }
  bridge?.webView?.load(URLRequest(url: target))
  return true
}
```

### 2.5 Connect it back to the web app
- The repo already listens for `tracktally-native` events in `lib/speech.ts` and falls back to Web Speech when native hooks aren’t present.
- When you’re ready, add a “Sign in via app” button on `/login` that calls `window.TrackTallyNative?.openAuthSession()`; the API routes you just built take care of the rest.

### 2.6 Build, sync, and run
Any time you change the Capacitor project:
```bash
npm run build          # bundle the web assets for Capacitor
npx cap sync           # copy assets + update native projects
npx cap open ios       # launch Xcode
```
On device, verify:
- First launch asks for mic + speech permissions and dictation feeds text into the note field.
- “Sign in” opens the Google auth tab, bounces back via `tracktally://`, and lands on `/teacher`.
- Incidents log normally, including offline queueing.

---

## 3. TestFlight & Distribution

1. **App Store Connect setup**
   - Create the app (name “TrackTally”, SKU, Bundle ID, primary language).
   - Fill out App Privacy (data types: contact info, identifiers, diagnostics, etc.).
   - Answer encryption export questions (“Yes, uses encryption”; “No” to exempt because HTTPS is standard).

2. **Archive & upload**
   - In Xcode: `Product → Archive`.
   - In the Organizer window, select the archive → “Distribute App” → App Store Connect → Upload.
   - Wait for processing (10–30 minutes). Resolve any build metadata warnings in App Store Connect → TestFlight.

3. **Beta App Review (first external build only)**
   - Provide demo credentials (Google account + instructions for the reviewer).
   - Describe key features, currently supported roles (Teacher/Admin), and that it targets a specific school.

4. **Invite testers**
   - External testers: create a group, add emails (or enable public link).
   - Internal testers: Individual accounts only support the account holder, so everyone else must be external.

5. **Rollout tips**
   - Ship release notes focusing on what to test (e.g., “Verify mic dictation and offline queue by …”).
   - Use TestFlight feedback links to capture screenshots/logs.
   - Keep builds under 90 days; ship a new build periodically even if unchanged.

6. **Plan for Organization account**
   - Once your school wants a managed rollout, convert or create an Organization developer account.
   - Re-upload under the org to unlock Custom Apps / Apple School Manager distribution.

---

## 4. Checklist

- [ ] Prisma model + migration committed.
- [ ] `lib/mobile-auth.ts` + `/api/mobile/auth/*` routes implemented.
- [ ] `/mobile-auth` page renders the NextAuth sign-in action.
- [ ] `lib/speech.ts` detects native bridge; `LoggerApp` listens for events.
- [ ] Capacitor project builds, speech works, Google sign-in completes end-to-end.
- [ ] Info.plist includes mic/speech descriptions + custom URL scheme.
- [ ] TestFlight build uploaded with reviewer instructions and demo account.
- [ ] External testers invited and onboarded.

Work through each section, marking the checklist as you finish. Ping me when you reach a blocker—the doc mirrors the exact file paths, so I can jump in quickly if you need hands-on help in a specific step.

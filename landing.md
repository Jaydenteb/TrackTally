# WritingTally Landing Page Blueprint

This template mirrors the home experience we want across the SpellTally suite. Tailor the copy to WritingTally’s writing-assessment story, but keep the structure so future apps can reuse it.

---

## Goals

- Showcase value to teachers and school leaders before sign-in.
- Keep visual language aligned with `Design.md` (glass header, gradient CTAs, generous cards).
- Provide a simple scroll path: Hero → Features → Integrations → Privacy → Closing CTA.

---

## Section Breakdown

1. **Header (sticky glass panel)**
   - `BrandLogo` on the left.
   - Anchor links: `/#features`, `/#integrations`, `/#security`.
   - Session-aware buttons:
     - Anonymous: `Log in` link + `Start teacher onboarding` button (`/login` and `/login?onboard=teacher` or similar).
     - Authenticated: `Go to your dashboard` button (role-aware route) and optional `Support` link.

2. **Hero**
   - Tagline pill: `WritingTally — AI-assisted writing assessment`.
   - H1 pattern: `Weekly writing moderation for [audience] that [benefit].`
   - Supporting paragraph describing teacher flow, student impact, and analytics.
   - Primary CTA: session aware (dashboard vs onboarding).
   - Secondary CTA: `Student or teacher login`.
   - Access note referencing Google Workspace domain restrictions + support email.

3. **Feature Grid (`id="features"`)**
   - 3–4 cards focusing on:
     - Assignment + rubric workflows.
     - Student submissions + AI drafts.
     - Cohort analytics / moderation evidence.
     - School admin + domain controls.
   - Each card uses soft border, light background, short descriptions.

4. **Integrations (`id="integrations"`)**
   - Highlight Google Workspace / Classroom + optional SIS exports.
   - Two cards:
     - `Scopes requested` – plain-language bullet list.
     - `Data handling` – where data lives, what is not synced, how to revoke access.

5. **Privacy & Security (`id="security"`)**
   - Two cards: `Data protection` and `Compliance & trust`.
   - Emerald callout encouraging schools to request a security pack or reach `support@writingtally.com`.

6. **Closing CTA**
   - Reiterate outcome (`Ready to simplify writing moderation?`).
   - Primary CTA (dashboard/onboarding) + secondary CTA (privacy policy or email support).

---

## Implementation Notes

- Build `app/page.tsx` as a Server Component so you can pull the NextAuth session and render session-aware CTAs.
- Use Tailwind utility classes already available in `globals.css` (no bespoke CSS file required).
- Keep sections under `max-w-6xl` with `px-6` horizontal padding so it matches the rest of the app.
- For cards, prefer `rounded-[24px] bg-card shadow-[var(--shadow-md)]`.
- Anchor links should work site-wide (`<a href="/#features">Features</a>`).

---

## Copy Guidelines

- Audience: teachers first, school admins second.
- Voice: calm, confident, mentions Australian curriculum references where needed.
- Avoid hype; focus on “time saved”, “moderation-ready evidence”, “privacy-first storage”.
- Always include a support contact near the access note and the security callout.

Use this doc whenever you refresh the landing page so the suite stays cohesive. Update the template when we introduce new shared sections or brand elements.


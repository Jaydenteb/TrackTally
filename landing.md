# SpellTally Suite – Landing Page Template

This document defines a reusable template for marketing landing pages across the SpellTally product suite. It mirrors the current SpellTally home page so that every app feels like part of the same family.

---

## Goals

- Consistent layout, tone, and visual language across all products.
- Clear, teacher-first storytelling with strong privacy messaging.
- Simple, scrollable page structure that works well on mobile.
- Reuse of the design tokens and components described in `Design.md`.

---

## Page Anatomy (Top to Bottom)

1. Sticky glass header
2. Hero (promise + primary calls-to-action)
3. Feature grid
4. Integrations / ecosystem section (per product)
5. Privacy & security
6. Closing CTA

Each section below describes structure and copy patterns that should match SpellTally.

---

## 1. Header

- **Component:** Reuse the `BrandLogo` and `glass-panel` header pattern.
- **Layout:** Full-width bar with:
  - Background: subtle radial gradient over a light slate surface.
  - Container: `mx-auto max-w-6xl px-4 py-6`.
  - Content: logo on the left, navigation and actions on the right.
- **Navigation (anchor links):**
  - `Features` → `#features`
  - `Privacy & Security` → `#security`
  - `Integrations` or platform-specific label (e.g. `Google Classroom`) → `#integrations` or a specific id (SpellTally uses `#google`).
- **Session-aware actions:**
  - When authenticated:
    - Button: `Go to your dashboard` → product-specific dashboard route.
  - When anonymous:
    - Link: `Log in` → `/login`.
    - Button: `Create [role] account` → `/register` or equivalent.

**Notes**
- Keep header interactions minimal and keyboard-accessible.
- Use the same rounded, pill-style buttons and hover states defined in `Design.md`.

---

## 2. Hero

The hero should match SpellTally’s hierarchy and tone: a compact tagline, a clear promise, supporting context, and two CTAs.

- **Tagline pill:**
  - Format: `[ProductName] — short 3–6 word descriptor`.
  - Example pattern: `Primary-school spelling made simple`.
  - Style: rounded pill with subtle gradient border and small-caps text.
- **H1 (main headline):**
  - One sentence focused on weekly workflows and outcomes.
  - Pattern: `Weekly [X] for [audience] that [benefit].`
- **Supporting paragraph:**
  - 2–3 sentences:
    - Sentence 1: explain how teachers use the product.
    - Sentence 2: explain what students/families experience.
    - Optional Sentence 3: highlight instant feedback or reporting.
- **Primary CTA button:**
  - When anonymous: `Start [role] onboarding` (e.g. `Start teacher onboarding`).
  - When authenticated: `Open my dashboard`.
  - Destination: product-specific onboarding or dashboard route.
- **Secondary CTA button:**
  - Text: `Student or teacher login` (adjust roles per app).
  - Destination: `/login`.
- **Access note:**
  - 1–2 lines explaining access restrictions (e.g. approved school domains).
  - Include `support@spelltally.com` or a product-specific support alias for access requests.

**Layout**
- Center-aligned content within `max-w-5xl`.
- Generous vertical spacing (`py-16 md:py-24`).
- Buttons stacked on mobile, inline on desktop.

---

## 3. Feature Grid (`#features`)

Every product should expose a concise grid of core capabilities using the same card style.

- **Section id:** `features`.
- **Heading:** `Features for [primary audience]` or similar.
- **Layout:**
  - Background: white surface with top border to separate from hero.
  - Grid: `sm:grid-cols-2 lg:grid-cols-3`, gap-based layout, `max-w-6xl`.
- **Cards:**
  - Title: short, task-oriented (e.g. `Teacher-focused workflows`).
  - Description: one single-sentence paragraph (18–24 words).
  - Style: rounded card with soft border, light slate background, and subtle shadow.

**Recommended feature categories**
- Primary role workflows (teachers, school admins, support staff).
- Student/learner experience (practice, assessments, feedback).
- Progress and reporting.
- Remediation or intervention tooling.
- Onboarding and access control.
- Compliance / audit reporting.

---

## 4. Integrations / Ecosystem

If a product integrates with external platforms (Google Classroom, LMS, SIS, etc.), use a section that mirrors SpellTally’s Google Classroom block.

- **Section id:**
  - Prefer `integrations`; for single primary platform you may mirror SpellTally’s pattern (e.g. `google`).
- **Heading:**
  - `[Platform] integration` (e.g. `Google Classroom integration`).
- **Intro paragraph:**
  - 2–3 sentences explaining:
    - Why the integration exists.
    - Which aspects of the platform are used.
    - Whether access is read-only or read/write.
- **Two-card layout:**
  - Card A — `Scopes requested`:
    - Bulleted list (3–5 items) describing scopes in plain language.
  - Card B — `Data handling`:
    - Bulleted list describing storage, use limitations, and admin controls.

**Tone**
- Emphasise least-privilege access and read-only scopes where possible.
- Explicitly state what is *not* done (e.g. “No grades are written back to Google.”).
- Highlight how administrators can revoke access or remove synced data.

---

## 5. Privacy & Security (`#security`)

This section should be structurally identical across the suite, with product-specific details filled in.

- **Section id:** `security`.
- **Heading:** `Privacy & Security`.
- **Two cards:**
  - Card 1 — `Data protection`:
    - HTTPS-only cookies and strong password hashing.
    - Single sign-on options and domain restrictions.
    - Role-based access (students see only their assignments, teachers only their groups/classes).
  - Card 2 — `Compliance & trust`:
    - Alignment with regional education privacy expectations.
    - Clear policies for families and staff.
    - Export and deletion options for student data.
- **Callout panel:**
  - Highlighted background (emerald-tinted) with:
    - Short paragraph inviting schools to request demos or complete security questionnaires.
    - Contact path: `support@spelltally.com` and/or `security@spelltally.app`.

**Guidelines**
- Use concrete, verifiable statements instead of vague claims.
- Keep bullets short; lead with the guarantee, then add detail.

---

## 6. Closing CTA

The final section re-states the core value and presents a last, low-friction next step.

- **Heading (H2):**
  - Question-style, benefit-focused.
  - Pattern: `Ready to [core outcome] with [ProductName]?`
- **Supporting paragraph:**
  - 1–2 sentences positioning the product as part of a weekly routine (not a one-off tool).
- **Primary CTA button:**
  - Anonymous: `Create my [role] account`.
  - Authenticated: `Go to my dashboard`.
  - Destination: onboarding flow or dashboard route.
- **Secondary CTA button:**
  - Common options:
    - `Review privacy policy`.
    - `Download overview` or `Share with IT`.
  - Destination: suite-level privacy/terms URL or product-specific docs.

---

## Copy & Tone Guidelines

- **Audience:** teachers and school leaders first; students and families second.
- **Voice:** calm, clear, and confident; avoid hype or jargon.
- **Focus:** weekly routines, learning outcomes, and time saved for teachers.
- **Structure:** parallel sentences in bullet lists for quick scanning.
- **Trust:** always surface support/security contact details near access and privacy content.

---

## Implementation Notes

- **Structure:**
  - Reuse the overall layout from `src/app/page.tsx`:
    - `<main>` with light slate background and subtle radial gradient.
    - Glass header with `BrandLogo`.
    - Section ids that match navigation anchors (`#features`, `#integrations`/`#google`, `#security`).
- **Logic:**
  - Use `auth()` to resolve the current user and role.
  - Derive dashboard routes from role (e.g. teacher, admin, student) and reflect that in CTAs.
- **Styling:**
  - Apply the color, typography, spacing, and button styles from `Design.md`.
  - Avoid introducing new colors or shadows unless they are added to the design system first.

Use this template as the starting point for every new product landing page. Customise copy and specific features, but keep the structure, layout, and tone aligned with SpellTally to maintain a cohesive suite experience.


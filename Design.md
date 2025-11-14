# TrackTally / SpellTally Design System – Technical Rundown

This document defines the shared design system for the SpellTally product suite, with **TrackTally** as a concrete implementation. Use these tokens and patterns for TrackTally and any future apps so everything feels like part of the same family.

---

## Color Palette

TrackTally already implements these tokens in `app/globals.css`.

### Primary Brand Colors

```css
/* Signature gradient – suite-wide primary */
--primary-gradient-start: #33d0f5; /* Cyan  */
--primary-gradient-end:   #6d3cff; /* Purple */
--primary-mid:            #5a62ff; /* Blue‑purple (hover) */
--primary-dark:           #3d2fd6; /* Deep purple (active) */
```

You can also define:

```css
--primary-gradient: linear-gradient(120deg, #33d0f5, #6d3cff);
```

### Accent Colors

```css
--accent-celebration: #ff9d6c; /* Orange – success, sparkles */
--accent-teal:        #23e6e0; /* Teal – highlights */
--accent-purple:      #7a58ff; /* Purple – tags, badges */
```

TrackTally additionally leans on teal‑green CTAs (e.g. `#0f766e` → `#14b8a6`) for primary buttons to keep incidents distinct but still inside the suite palette.

### Text Colors

```css
/* Light mode */
--text-main:   #0b1220; /* Near black – body text */
--text-muted:  #42557a; /* Slate gray – secondary text */
```

Dark‑mode text tokens are defined in the dark‑mode section below.

### Surface Colors

```css
/* Light mode */
--surface-base:   #ffffff; /* Cards, panels */
--surface-muted:  #f6f8fc; /* Background panels */
--surface-subtle: #eef3fb; /* Page background */
```

---

## Typography

### Font Stack

```css
font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

TrackTally already uses this stack in `app/globals.css`.

**How to add Inter via Google Fonts (non‑Next.js projects):**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

### Font Sizes & Weights (Tailwind-style reference)

| Element          | Size                 | Weight | Usage              |
| ---------------- | -------------------- | ------ | ------------------ |
| Hero Heading     | `text-4xl sm:text-5xl` | 600  | Main titles        |
| Section Heading  | `text-3xl`           | 600    | Section titles     |
| Card Heading     | `text-lg`            | 600    | Card titles        |
| Body Text        | `text-base sm:text-lg` | 400  | Paragraphs         |
| Small Text       | `text-sm`            | 500    | Labels             |
| Micro Text       | `text-xs`            | 600    | Badges, tags       |

---

## Logo & Header

### TrackTally logo

TrackTally currently uses a simple text logo plus an optional mark icon:

- Product name: **TrackTally**
- Font: Inter (or system UI), bold, ~1.25rem in the header
- Optional mark: `public/brand/mark.svg` (suite mark that can be reused across apps)

**Current React logo component (TrackTally)**

```tsx
import Link from "next/link";

export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>TrackTally</span>
    </Link>
  );
}
```

You can later swap the text span for a shared SpellTally suite wordmark SVG, but keep the component API the same across apps.

### Header pattern

For suite landing pages, reuse a sticky glass header:

```tsx
<header className="relative border-b border-slate-200/60 bg-[radial-gradient(circle_at_top,_#f6f8fc_0%,_rgba(255,255,255,0.6)_55%,_rgba(255,255,255,0)_100%)]">
  <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
    <BrandLogo />
    {/* Navigation / CTAs */}
  </div>
</header>
```

TrackTally’s `app/layout.tsx` currently implements a header using the same visual ideas (glass effect, sticky, shared `BrandLogo`) with product‑specific navigation links.

---

## Button Styles

### Primary Button (suite gradient)

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.2rem;
  border-radius: 18px;
  background: linear-gradient(120deg, #33d0f5, #6d3cff);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(24, 34, 72, 0.12);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 40px rgba(24, 34, 72, 0.16);
}
```

**Tailwind-equivalent:**

```tsx
className="inline-flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-[#33D0F5] to-[#6D3CFF] px-5 py-2 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
```

### Secondary Button

```css
.btn-secondary {
  padding: 0.45rem 1.1rem;
  border-radius: 18px;
  border: 1px solid rgba(58, 76, 130, 0.22);
  background: rgba(255, 255, 255, 0.6);
  color: #42557a;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-secondary:hover {
  color: #3d2fd6;
  border-color: rgba(93, 108, 196, 0.35);
  background: rgba(255, 255, 255, 0.9);
}
```

TrackTally also uses teal‑gradient buttons (see `app/login/page.module.css`) for sign‑in CTAs; keep radius and shadow consistent with this section.

---

## Card/Surface Styles

### Card Surface

```css
.card-surface {
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(24, 34, 72, 0.12);
}
```

**Tailwind-equivalent:**

```tsx
className="rounded-[24px] bg-white shadow-[0_6px_20px_rgba(24,34,72,0.12)]"
```

### Glass Panel Effect (headers / nav)

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}
```

### Tag/Pill Component

```css
.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 999px;
  background: linear-gradient(
    120deg,
    rgba(51, 208, 245, 0.18),
    rgba(109, 60, 255, 0.18)
  );
  color: #3d2fd6;
  padding: 0.35rem 0.85rem;
  font-size: 0.72rem;
  font-weight: 600;
}
```

---

## Spacing & Dimensions

### Border Radius Scale (recommended)

These are not all wired into TrackTally yet, but use them when adding new components:

```css
--radius-xs: 6px;  /* Small elements */
--radius-sm: 10px; /* Minor components */
--radius-md: 14px; /* Inputs, small buttons */
--radius-lg: 18px; /* Buttons, badges */
--radius-xl: 24px; /* Cards, panels */
```

### Shadow Scale

```css
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
--shadow-md: 0 6px 20px rgba(24, 34, 72, 0.12);
--shadow-lg: 0 16px 40px rgba(24, 34, 72, 0.16);
```

### Standard Transition

```css
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Button Press Animation

```css
button:not(:disabled):active {
  transform: translateY(1px);
}
```

---

## Dark Mode Support

Planned dark mode support uses a `data-theme="dark"` attribute on the `<html>` element. TrackTally does not yet toggle this in production, but the tokens are defined here for future use.

```tsx
// Toggle dark mode
document.documentElement.setAttribute("data-theme", "dark");
// or
document.documentElement.removeAttribute("data-theme");
```

**Dark mode CSS variables (recommended):**

```css
[data-theme="dark"] {
  --background:      #0f172a;
  --foreground:      #e3e9ff;
  --surface-base:    #131b2c;
  --surface-muted:   #0d1424;
  --surface-subtle:  #0a101f;
  --text-main:       #e3e9ff;
  --text-muted:      #9faedc;
  --border-muted:    rgba(101, 116, 167, 0.4);
}
```

---

## Complete CSS Variables (reference)

Use this as the reference set when wiring new apps. TrackTally’s `app/globals.css` already includes the primary, accent, text, surface, border, shadow, and animation tokens.

```css
:root {
  /* Primary gradient */
  --primary-gradient-start: #33d0f5;
  --primary-gradient-end:   #6d3cff;
  --primary-mid:            #5a62ff;
  --primary-dark:           #3d2fd6;

  /* Accent colors */
  --accent-celebration: #ff9d6c;
  --accent-teal:        #23e6e0;
  --accent-purple:      #7a58ff;

  /* Text colors */
  --text-main:   #0b1220;
  --text-muted:  #42557a;

  /* Surface colors */
  --surface-base:   #ffffff;
  --surface-muted:  #f6f8fc;
  --surface-subtle: #eef3fb;

  /* Border */
  --border-muted: rgba(58, 76, 130, 0.22);

  /* Shadows */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 6px 20px rgba(24, 34, 72, 0.12);
  --shadow-lg: 0 16px 40px rgba(24, 34, 72, 0.16);

  /* Border radius scale */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 24px;

  /* Animation */
  --ease-standard:    cubic-bezier(0.4, 0, 0.2, 1);
  --transition-fast:  150ms var(--ease-standard);
}

body {
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  color: var(--text-main);
  background: var(--surface-subtle);
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

---

## Brand Identity Summary

**Core brand elements (suite‑wide):**

- **Primary gradient:** `#33D0F5 + #6D3CFF` (cyan → purple) at 120deg
- **Font:** Inter (sans‑serif, weights 400, 500, 600, 700)
- **Border radius:** generous (18–24px for main elements)
- **Shadows:** soft, subtle (blue‑gray tones)
- **Animation:** 150ms with smooth cubic‑bezier easing
- **Logo height:** ~40px in header

**TrackTally specifics:**

- Uses the shared gradient for suite context; leans on teal‑green (`#0f766e`, `#14b8a6`) for primary in‑app CTAs.
- Logger UI is compact and mobile‑first, centred in a 480px column with card surfaces and strong typography.
- Global header and footer use glass panels and light surfaces to feel like part of the same suite as other SpellTally products.

This gives you everything needed to maintain visual consistency across TrackTally and the broader SpellTally suite.


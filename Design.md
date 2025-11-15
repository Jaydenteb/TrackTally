# WritingTally Design System – Technical Rundown

This guide documents the design system shared across the SpellTally suite, with **WritingTally** as the reference implementation. Use these tokens, components, and patterns whenever you build public marketing pages or in-product views so every app feels cohesive.

---

## Color Palette

WritingTally already ships with these CSS variables in `app/globals.css`.

### Primary Brand Colors

```css
--primary-gradient-start: #33d0f5; /* Cyan */
--primary-gradient-end:   #6d3cff; /* Purple */
--primary-mid:            #5a62ff; /* Hover / mid tone */
--primary-dark:           #3d2fd6; /* Active states */
--primary-gradient: linear-gradient(120deg, #33d0f5, #6d3cff);
```

### Accent Colors

```css
--accent-celebration: #ff9d6c;
--accent-teal:        #23e6e0;
--accent-purple:      #7a58ff;
```

### Text & Surface Colors

```css
--text-main:   #0b1220;
--text-muted:  #42557a;
--surface-base:   #ffffff;
--surface-muted:  #f6f8fc;
--surface-subtle: #eef3fb;
```

Dark mode variants mirror the values in `app/globals.css` (`.dark { … }` block).

### Shadow + Radius Scale

```css
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
--shadow-md: 0 6px 20px rgba(24, 34, 72, 0.12);
--shadow-lg: 0 16px 40px rgba(24, 34, 72, 0.16);

--radius-xs: 6px;
--radius-sm: 10px;
--radius-md: 14px;
--radius-lg: 18px;
--radius-xl: 24px;

--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--transition-fast: 150ms var(--ease-standard);
```

---

## Typography

```css
font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Tailwind size guidance:

| Element             | Size                    | Weight | Notes                   |
| ------------------- | ----------------------- | ------ | ----------------------- |
| Hero heading        | `text-4xl sm:text-5xl`  | 600    | Landing hero            |
| Section heading     | `text-3xl`              | 600    | Major sections          |
| Card heading        | `text-lg`               | 600    | Dashboard cards         |
| Body text           | `text-base sm:text-lg`  | 400    | Paragraphs              |
| Label / helper text | `text-sm`               | 500    | Form + UI labels        |
| Micro text          | `text-xs`               | 600    | Badges, overlines       |

---

## Logo & Header Pattern

- **Logo:** `components/brand-logo.tsx` renders `/brand/wordmark.svg` at 144×40 with a drop shadow. Keep this component reference identical across apps so swapping assets is trivial.
- **Header:** sticky glass bar using the `.glass-panel` utility defined in `app/globals.css`.
  ```tsx
  <header className="glass-panel sticky top-0 z-30 border-b border-border/60">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <BrandLogo />
      {/* Navigation + CTA */}
    </div>
  </header>
  ```
- **Session-aware CTA:** when unauthenticated show `Log in` + `Start teacher onboarding`; when authenticated show `Open your dashboard`.

---

## Buttons

### Primary (gradient)

```tsx
className="inline-flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-[#33D0F5] to-[#6D3CFF]
px-5 py-2 font-semibold text-white shadow-[0_6px_20px_rgba(24,34,72,0.12)]
transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(24,34,72,0.16)]"
```

### Secondary

```tsx
className="rounded-[18px] border border-[rgba(58,76,130,0.22)] bg-white/80
px-4 py-2 text-sm font-medium text-[#42557a] shadow-sm transition hover:border-[#5d6cc4]"
```

---

## Components & Effects

- **Cards:** `rounded-[24px] bg-card shadow-[var(--shadow-md)]`.
- **Glass panel:** `.glass-panel` utility in `globals.css`.
- **Tag pills:** use gradient backgrounds with `text-primary-dark`; example in `landing.tsx` hero badge.
- **Transitions:** apply `transition-all duration-150` plus `hover:-translate-y-0.5` for interactive cards/buttons.

---

## Dark Mode Support

`document.documentElement.classList.toggle("dark")` switches the palette. All CSS variables already define dark equivalents; new components should rely on semantic colors (`bg-card`, `text-muted-foreground`, etc.) instead of hard-coded hex values.

---

## Brand Identity Summary

- **Palette:** cyan → purple gradient with teal/orange/purple accents.
- **Shapes:** large radii (18–24px), pill buttons, soft glass surfaces.
- **Shadows:** subtle blue-grey for light mode, deeper rgba(0,0,0,0.3+) in dark mode.
- **Typography:** Inter 400/500/600/700 with generous tracking on overlines.
- **Animation:** snappy 150ms easing, consistent hover translation.

Use this as the canonical reference when you create marketing content, new dashboard sections, or extend other SpellTally products. If a new token or component doesn’t exist here yet, add it before adopting it in code so the rest of the suite can reuse it.


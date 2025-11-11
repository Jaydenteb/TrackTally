# SpellTally Design System - Technical Rundown

Here's everything you need to replicate SpellTally's styling, theme, and branding across your other apps:

---

## 🎨 **Color Palette**

### Primary Brand Colors
```css
/* Signature Gradient - Use this EVERYWHERE for brand consistency */
--primary-gradient: linear-gradient(120deg, #33D0F5, #6D3CFF);
--primary-gradient-start: #33D0F5;  /* Cyan */
--primary-gradient-end: #6D3CFF;    /* Purple */
--primary-mid: #5A62FF;             /* Blue-Purple (hover states) */
--primary-dark: #3D2FD6;            /* Deep Purple (active states) */
```

### Accent Colors
```css
--accent-celebration: #FF9D6C;  /* Orange - success, sparkles */
--accent-teal: #23E6E0;         /* Teal - highlights */
--accent-purple: #7A58FF;       /* Purple - tags, badges */
```

### Text Colors
```css
/* Light Mode */
--text-main: #0B1220;    /* Near black - body text */
--text-muted: #42557A;   /* Slate gray - secondary text */

/* Dark Mode */
--text-main: #E3E9FF;    /* Light blue - body text */
--text-muted: #9FAEDC;   /* Light slate - secondary text */
```

### Surface Colors
```css
/* Light Mode */
--surface-base: #FFFFFF;     /* White - cards, panels */
--surface-muted: #F6F8FC;    /* Light gray - backgrounds */
--surface-subtle: #EEF3FB;   /* Very light blue - page background */

/* Dark Mode */
--surface-base: #131B2C;     /* Dark blue - cards */
--surface-muted: #0D1424;    /* Darker blue - backgrounds */
--surface-subtle: #0A101F;   /* Darkest blue - page background */
```

---

## 🔤 **Typography**

### Font Stack
```css
font-family: 'Inter', 'Segoe UI', sans-serif;
```

**How to add Inter:**
```html
<!-- In your HTML <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Font Sizes & Weights
| Element | Size (Tailwind) | Weight | Usage |
|---------|----------------|--------|-------|
| Hero Heading | `text-4xl sm:text-5xl` | 600 (semibold) | Main titles |
| Section Heading | `text-3xl` | 600 | Section titles |
| Card Heading | `text-lg` | 600 | Card titles |
| Body Text | `text-base sm:text-lg` | 400 (normal) | Paragraphs |
| Small Text | `text-sm` | 500 (medium) | Labels |
| Micro Text | `text-xs` | 600 | Badges, tags |

---

## 🎯 **Logo & Header**

### Logo Specifications

**Wordmark (Full Logo)**
- Dimensions: 220×64 viewBox (displayed as 144×40px)
- Gradient background: `#33D0F5 → #6D3CFF`
- White text: "SpellTally"
- Font: Inter, 28px, weight 700
- Border radius: 24px
- Shadow: `0 4px 8px rgba(24,34,72,0.15)`
- Letter spacing: 0.02em

**Mark/Icon**
- Dimensions: 120×120 viewBox
- Circular badge with gradient
- "ST" letters with decorative hat element
- Multiple accent colors for sparkles

**Favicon**
- Dimensions: 64×64 viewBox
- Rounded square with gradient
- "SP" text in white
- Border radius: 16px

### Logo Component
```tsx
import Image from 'next/image';

export function BrandLogo() {
  return (
    <Image
      src="/brand/wordmark.svg"
      alt="SpellTally wordmark"
      width={144}
      height={40}
      priority
      className="h-10 w-auto"
    />
  );
}
```

### Header Pattern
```tsx
<header className="relative border-b border-slate-200/60 bg-[radial-gradient(circle_at_top,_#f6f8fc_0%,_rgba(255,255,255,0.6)_55%,_rgba(255,255,255,0)_100%)]">
  <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
    <BrandLogo />
    {/* Navigation */}
  </div>
</header>
```

---

## 🔘 **Button Styles**

### Primary Button
```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.2rem;
  border-radius: 18px;
  background: linear-gradient(120deg, #33D0F5, #6D3CFF);
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

**Tailwind equivalent:**
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
  color: #42557A;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-secondary:hover {
  color: #3D2FD6;
  border-color: rgba(93, 108, 196, 0.35);
  background: rgba(255, 255, 255, 0.9);
}
```

---

## 📦 **Card/Surface Styles**

### Card Surface
```css
.card-surface {
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(24, 34, 72, 0.12);
}
```

**Tailwind equivalent:**
```tsx
className="rounded-[24px] bg-white shadow-[0_6px_20px_rgba(24,34,72,0.12)]"
```

### Glass Panel Effect (for headers)
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
  background: linear-gradient(120deg, rgba(51, 208, 245, 0.18), rgba(109, 60, 255, 0.18));
  color: #3D2FD6;
  padding: 0.35rem 0.85rem;
  font-size: 0.72rem;
  font-weight: 600;
}
```

---

## 📐 **Spacing & Dimensions**

### Border Radius Scale
```css
--radius-xs: 6px;   /* Small elements */
--radius-sm: 10px;  /* Minor components */
--radius-md: 14px;  /* Inputs, small buttons */
--radius-lg: 18px;  /* Buttons, badges */
--radius-xl: 24px;  /* Cards, panels */
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

## 🎭 **Dark Mode Support**

SpellTally uses `data-theme="dark"` attribute on the `<html>` element:

```tsx
// Toggle dark mode
document.documentElement.setAttribute('data-theme', 'dark');
// or
document.documentElement.removeAttribute('data-theme');
```

**Dark mode CSS variables:**
```css
[data-theme='dark'] {
  --background: #0f172a;
  --foreground: #e3e9ff;
  --surface-base: #131b2c;
  --surface-muted: #0d1424;
  --surface-subtle: #0a101f;
  --text-main: #e3e9ff;
  --text-muted: #9faedc;
  --border-muted: rgba(101, 116, 167, 0.4);
}
```

---

## 🚀 **Complete CSS Variables**

### Copy this into your global CSS:
```css
:root {
  /* Primary gradient */
  --primary-gradient-start: #33d0f5;
  --primary-gradient-end: #6d3cff;
  --primary-mid: #5a62ff;
  --primary-dark: #3d2fd6;

  /* Accent colors */
  --accent-celebration: #ff9d6c;
  --accent-teal: #23e6e0;
  --accent-purple: #7a58ff;

  /* Text colors */
  --text-main: #0b1220;
  --text-muted: #42557a;

  /* Surface colors */
  --surface-base: #ffffff;
  --surface-muted: #f6f8fc;
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
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --transition-fast: 150ms var(--ease-standard);
}

body {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  color: var(--text-main);
  background: var(--surface-subtle);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

---

## 🎨 **Brand Identity Summary**

**Core Brand Elements:**
- **Primary Gradient:** `#33D0F5 → #6D3CFF` (cyan to purple) at 120deg angle
- **Font:** Inter (sans-serif, weights: 400, 500, 600, 700)
- **Border Radius:** Generous (18-24px for main elements)
- **Shadows:** Soft, subtle (using blue-gray tones)
- **Animation:** 150ms with smooth cubic-bezier easing
- **Logo Height:** 40px (in header)

**Visual Personality:**
- Modern and friendly
- Colorful but professional
- Gradients for primary actions
- Soft shadows for depth
- Rounded corners for approachability
- Accessible contrast ratios

This gives you everything needed to maintain visual consistency across all your applications!

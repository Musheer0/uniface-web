---
version: alpha
name: shadcnblocks
description: The default shadcn/ui theme — pure black-and-white neutrals, functional clarity, and zero personality friction by shadcnblocks.
colors:
  background: "#ffffff"
  foreground: "#0a0a0a"
  card: "#ffffff"
  primary: "#171717"
  primary-foreground: "#fafafa"
  secondary: "#f5f5f5"
  secondary-foreground: "#171717"
  muted: "#f5f5f5"
  muted-foreground: "#737373"
  accent: "#f5f5f5"
  accent-foreground: "#171717"
  destructive: "#e7000b"
  border: "#e5e5e5"
  input: "#e5e5e5"
  ring: "#a1a1a1"
  sidebar: "#fafafa"
  sidebar-foreground: "#0a0a0a"
  sidebar-primary: "#171717"
  sidebar-accent: "#f5f5f5"
  chart-1: "#f54900"
  chart-2: "#009689"
  chart-3: "#104e64"
  chart-4: "#ffb900"
  chart-5: "#fe9a00"
  dark-background: "#0a0a0a"
  dark-foreground: "#fafafa"
  dark-card: "#0a0a0a"
  dark-primary: "#e5e5e5"
  dark-secondary: "#262626"
  dark-muted: "#262626"
  dark-muted-foreground: "#a1a1a1"
  dark-accent: "#262626"
  dark-border: "#262626"
  dark-sidebar: "#171717"
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  serif-display:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.15
  mono:
    fontFamily: IBM Plex Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  section: 64px
  gutter: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.lg}"
    padding: 12px
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 12px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: 24px
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 12px
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
---

# shadcnblocks

The default shadcn/ui theme by shadcnblocks. Install tokens with `npx shadcn@latest add @shadcnblocks/theme/shadcnblocks`, then keep this DESIGN.md in the project root (or `.agents/`) so coding agents stay on-brand.

## Overview

shadcnblocks is the library's neutral foundation — pure achromatic surfaces, near-black type on white canvas, and just enough structure to disappear behind whatever product you're building. This is the blank-canvas theme: it carries no personality of its own, so it adapts to any vertical without fighting your brand layer.

The system is **functional, invisible, and versatile**. It suits SaaS dashboards, documentation sites, developer tools, and any product that treats color as a content-layer concern rather than a chrome concern. The only chromatic moment is the chart palette (orange → teal → navy → gold → amber), which provides data-visualization variety without bleeding into UI controls.

Emotional targets: neutral, professional, quietly confident — never branded, never playful, never loud.

## Colors

The palette is **achromatic with functional chart color**. All interactive and structural surfaces use shades of gray; color enters only through data visualization and destructive states.

- **Primary (`#171717`):** Near-black — primary buttons, links, key CTAs. In dark mode, inverts to near-white (`#e5e5e5`) so actions stay prominent.
- **Secondary (`#f5f5f5`):** Light gray — secondary buttons, quiet wells, toggle backgrounds. Structure without contrast.
- **Muted (`#f5f5f5`):** Same light gray for skeleton fills, table headers, and background accents.
- **Foreground (`#0a0a0a`):** True near-black — body text, headings. Crisp and legible.
- **Background (`#ffffff`):** Pure white canvas — page stage. No warm or cool tint.
- **Card (`#ffffff`):** White surfaces — content panels sit flush with the canvas; borders provide structure.
- **Border (`#e5e5e5`):** Neutral gray — subtle separators, input outlines, card edges.
- **Ring (`#a1a1a1`):** Mid-gray focus ring — visible but unbranded.
- **Destructive (`#e7000b`):** Bright red for errors and danger — the only saturated UI color in light mode.

Dark mode keeps the same achromatic story: black canvas, white text, gray chrome. No colored accents creep into the UI.

## Typography

**Inter** is the sole UI face — display, body, and labels all share one family. **Playfair Display** is available as an optional serif for editorial moments. **IBM Plex Mono** covers code.

- **Display / headlines:** Inter SemiBold–Bold, tight tracking. Clean and geometric.
- **Body:** Inter Regular at 16px with 1.6 line-height. Maximum readability.
- **Labels / UI chrome:** Inter Medium at 14px. Sentence case throughout.
- **Serif moments:** Playfair Display is optional — use only for hero marketing or editorial callouts, never in app chrome.
- **Mono:** IBM Plex Mono for code blocks, tokens, and IDs.

Avoid adding personality fonts (rounded sans, handwriting, novelty display). The theme's power is its typographic neutrality.

## Layout

Use a **clean product rhythm**: 8px base scale, consistent spacing, and flat containment.

- Prefer a max-width content column (~1200px) with `2rem` horizontal gutters.
- Cards and content panels sit flush on white; borders provide the only visual separation.
- Marketing pages: straightforward hierarchy — one headline, one supporting line, one CTA group per viewport.
- App shells: light sidebar on fafafa, white content pane. Navigation is quiet; black text, no colored active states.
- Density: medium-high. The achromatic palette enables tighter layouts without visual noise.

## Elevation & Depth

Depth is **minimal and functional** — thin shadows at very low opacity, never decorative.

- Prefer flat design with border separation over shadow layering.
- Shadows exist (`shadow-sm` through `shadow-xl`) but are always subtle — `0.05`–`0.10` opacity.
- Tonal layering: white canvas → gray well → black action. No mid-tone colored layers.
- Avoid colored glows, ambient shadows, or glassmorphism — they add personality this theme deliberately avoids.
- Dark mode: elevate with lighter gray cards and borders, not bright outlines.

## Shapes

Corner radius is **modest** — base `--radius` is `0.5rem` (8px).

- Buttons, inputs, and controls: ~8px (`rounded-lg`).
- Cards and large panels: ~12px (`rounded-xl`).
- Pills/avatars: full rounding only for truly circular elements.
- Do not mix sharp 0px corners with soft ones — keep the 8px language consistent.

## Components

Built for the shadcn/ui token contract. Prefer semantic tokens (`bg-primary`, `text-muted-foreground`) over raw hex in component code.

- **Primary button:** Near-black fill, white label. High contrast, zero personality.
- **Secondary button:** Light gray fill for alternate actions — zero personality.
- **Outline / ghost:** Black text on transparent; borders use `border`, not primary.
- **Cards:** White surface, gray border, xl radius, airy padding (24px). No shadow by default.
- **Inputs:** White fields, gray borders, gray focus ring. Error states use destructive red.
- **Sidebar:** Fafafa background with black text; no active-state color — use bold weight or subtle background shift.
- **Charts:** Series order orange → teal → navy → gold → amber. Keep axis and grid lines in `border`/`muted`.
- **Badges:** Muted gray fills for status; destructive red for alerts. No colorful badge rainbow.

## Do's and Don'ts

**Do**

- Do keep surfaces achromatic — white, near-white, gray, near-black.
- Do let content (images, charts, user data) bring color; the chrome stays neutral.
- Do use Inter throughout; one typeface, multiple weights.
- Do preserve the 8px radius and low-opacity shadows.
- Do support light and dark as a simple inversion — no brand color in either mode.

**Don't**

- Don't introduce a branded primary color (blue, purple, green) into the structural chrome.
- Don't add gradients, glows, or colored ambient effects.
- Don't use decorative serif or rounded display fonts in UI chrome.
- Don't increase shadow opacity or spread to create "depth theater."
- Don't mix pill-shaped buttons with the 8px radius system.
- Don't invent one-off hex values when the existing neutral scale (`#0a0a0a` → `#fafafa`) already has the right tone.

---
name: Speaking Pro Corporate Identity
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#44474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#75777e'
  outline-variant: '#c5c6cd'
  surface-tint: '#515f78'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#0d1c32'
  on-primary-container: '#76849f'
  inverse-primary: '#b9c7e4'
  secondary: '#00629d'
  on-secondary: '#ffffff'
  secondary-container: '#00a2fd'
  on-secondary-container: '#003558'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001f24'
  on-tertiary-container: '#0091a2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b9c7e4'
  on-primary-fixed: '#0d1c32'
  on-primary-fixed-variant: '#39475f'
  secondary-fixed: '#cfe5ff'
  secondary-fixed-dim: '#98cbff'
  on-secondary-fixed: '#001d33'
  on-secondary-fixed-variant: '#004a77'
  tertiary-fixed: '#9cf0ff'
  tertiary-fixed-dim: '#00daf3'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004f58'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  text-secondary: '#64748B'
  surface-card: '#FFFFFF'
  stroke-subtle: '#E2E8F0'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  bento-gap: 12px
---

## Brand & Style

The design system is engineered for a premium, edutech environment that balances corporate authority with high-tech innovation. The target audience includes ambitious professionals and students who value efficiency and high-end aesthetics. 

The style utilizes a **Modern Bento Grid** approach, inspired by high-end dashboard interfaces. It leans heavily into a clean, expensive feel characterized by generous negative space, sophisticated depth, and a structural layout that organizes complex data into digestible, rounded modules. The aesthetic is "Tech-Premium"—combining the stability of corporate navy with the kinetic energy of electric cyan and neon mint accents.

Key characteristics:
- **Modular:** Information is encapsulated in distinct containers.
- **Luminous:** Use of glows and subtle gradients to highlight progress.
- **Mobile-First:** Prioritizing thumb-driven interactions and vertical stackability.

## Colors

The palette is anchored by **Deep Corporate Navy**, used for high-importance cards and primary backgrounds to establish a "Pro" feel. The **Slate 50** neutral provides a crisp, expansive canvas that prevents the dark elements from feeling heavy.

**Electric Cyan Blue** serves as the primary action color, driving user focus toward CTA buttons and active states. **Light Aqua/Neon Mint** is reserved for success states, achievement badges, and progress indicators, providing a high-visibility contrast against the navy. Text is tiered between the deep navy for headings and **Slate 500** for secondary metadata to maintain a clear visual hierarchy.

## Typography

The design system utilizes **Plus Jakarta Sans** for its contemporary, approachable, and slightly wide proportions which feel expensive and readable. 

The scale is intentionally bold. Large "Display" and "Headline" sizes use tighter letter-spacing and heavy weights (700-800) to create a strong editorial presence within Bento modules. For mobile screens, headlines scale down slightly to ensure word-wrap integrity while maintaining visual punch. Labels and captions use medium to semi-bold weights to remain legible even at small sizes against tinted backgrounds.

## Layout & Spacing

This design system uses a **Fluid Bento Grid** model. On mobile devices, the layout typically resolves to a single or dual-column vertical stack. On larger screens, elements expand into a multi-column grid with varied module heights (1x1, 2x1, 2x2 spans).

**Spacing Principles:**
- Use a **12px gap** between grid modules (Bento units) to maintain a cohesive but airy structure.
- Content within modules should follow a **24px internal padding** rule to align with the large corner radii.
- Horizontal screen margins are set at **20px on mobile** to maximize the width of the grid cards while providing a "safe" gutter from the device edge.

## Elevation & Depth

Depth is achieved through a combination of **Tonal Layering** and **Luminous Shadows**. 

1.  **Low Elevation (Level 1):** Standard white cards on the Slate 50 background feature a very soft, diffuse shadow: `0 4px 20px rgba(0, 163, 255, 0.05)`. This creates a subtle lift without looking "heavy."
2.  **High Elevation (Level 2):** Floating elements or active modules use a slightly more pronounced shadow with increased spread to indicate interactivity.
3.  **Glassmorphism:** The bottom navigation bar and contextual overlays use a frosted glass effect (Blur: 20px, Opacity: 80%) to maintain a sense of space and continuity as content scrolls behind them.
4.  **Inner Glows:** For Deep Navy cards, use a subtle `1px` inner border (10% white) to define the edges against dark backgrounds.

## Shapes

The visual signature of this design system is its **Hyper-Roundedness**. A consistent **24px (rounded-3xl)** radius is applied to all primary Bento modules and cards. 

- **Primary Cards:** 24px (rounded-3xl)
- **Secondary Buttons & Inputs:** 16px (rounded-2xl)
- **Tags & Chips:** 100px (Pill-shaped)

This generous rounding softens the "corporate" nature of the colors, making the edutech experience feel friendly, modern, and tactile.

## Components

### Buttons
- **Primary:** Deep Navy background with White text, or Electric Cyan with White text. 16px border radius. High-gloss finish on hover.
- **Ghost:** No background, Electric Cyan border (1px), for secondary actions like "View All."

### Bento Cards
- **Dark Mode Card:** Deep Corporate Navy background, Neon Mint for accent text/icons.
- **Light Mode Card:** White background, subtle 1px Slate 100 border, soft blue ambient shadow.

### Input Fields
- White background with a 1px Slate 200 stroke. On focus, the stroke transitions to Electric Cyan with a subtle outer glow.

### Progress Indicators
- Use a "thick" stroke (8px+) for circular progress. Utilize the Neon Mint color for completed segments to provide a "glow" effect against the navy modules.

### Navigation
- **Bottom Bar:** Glassmorphic (Backdrop blur), floating 8px from the bottom edge, with 24px corner radius. Icons from **Lucide React**, using a 2px stroke weight for clarity.

### Chips & Badges
- Small, pill-shaped elements. Use semi-transparent backgrounds of the accent colors (e.g., Cyan at 10% opacity) with high-contrast text for status indicators.
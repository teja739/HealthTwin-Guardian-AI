---
name: HealthTwin Guardian AI
colors:
  surface: '#f6fafe'
  surface-dim: '#d6dade'
  surface-bright: '#f6fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f8'
  surface-container: '#eaeef2'
  surface-container-high: '#e4e9ed'
  surface-container-highest: '#dfe3e7'
  on-surface: '#171c1f'
  on-surface-variant: '#45464d'
  inverse-surface: '#2c3134'
  inverse-on-surface: '#edf1f5'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#410004'
  on-tertiary-container: '#ef4444'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#f6fafe'
  on-background: '#171c1f'
  surface-variant: '#dfe3e7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  section-gap: 48px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style

The design system is engineered for the intersection of clinical precision and predictive intelligence. The brand personality is **Authoritative**, **Vigilant**, and **Empathetic**, positioning the product as a high-end medical companion rather than a mere utility.

The visual style blends **Modern Corporate** reliability with **Glassmorphism** accents to signify the "digital twin" aspect—representing data transparency and the multi-layered nature of human health. The interface utilizes subtle glows and "data-light" effects to guide the user's eye toward critical insights, maintaining a futuristic aesthetic that remains grounded in medical-grade safety standards. High whitespace and a structured information hierarchy ensure that complex AI-driven data remains accessible and stress-free for the user.

## Colors

The palette is anchored by **Guardian Blue**, a deep navy that establishes immediate trust and institutional authority. **Life Teal** serves as the primary action and health-state color, symbolizing vitality and successful monitoring. **Emergency Red** is reserved strictly for high-alert biometric deviations and critical system notifications.

**Soft Slate** provides a low-strain foundation for the background, reducing visual fatigue during long-term monitoring. For the glassmorphic layers, use a semi-transparent white (alpha 0.6 to 0.8) with a high-intensity background blur to maintain legibility while creating a sense of depth and technical sophistication.

## Typography

This design system utilizes **Inter** for all primary communication to ensure maximum legibility and a neutral, professional tone. Headlines use tighter letter-spacing and heavier weights to feel "impactful" and "anchored."

To emphasize the AI-driven, technical nature of the HealthTwin, **JetBrains Mono** is introduced for labels, biometric readouts, and timestamps. This monospaced font creates a distinct visual rhythm for data-heavy sections, making individual digits easier to scan and compare during clinical review.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a maximum content width of 1440px for desktop. It utilizes an 8px base unit for all spatial relationships. 

- **Desktop:** 12-column grid with 24px gutters and 40px margins.
- **Tablet:** 8-column grid with 16px gutters and 24px margins.
- **Mobile:** 4-column grid with 16px gutters and 16px margins.

Content is organized in "Insight Blocks"—modular units that stack vertically on mobile and reflow into complex dashboard layouts on larger screens. Large "Safe Areas" are maintained around critical biometric charts to prevent accidental interactions and ensure clarity.

## Elevation & Depth

Hierarchy is established through a combination of **Tonal Layers** and **Glassmorphism**. 

1. **Base Layer:** Soft Slate solid background.
2. **Surface Layer:** White or light-gray cards with subtle 1px borders (10% opacity Guardian Blue).
3. **Glass Layer:** Used for high-level navigation, floating action panels, and "AI Suggestions." These utilize a `backdrop-filter: blur(20px)` and a soft internal white glow to appear as if they are floating above the data.
4. **Shadows:** Use ultra-diffused, large-radius shadows (e.g., `0 20px 40px rgba(15, 23, 42, 0.05)`) to avoid a "heavy" feeling while still providing clear separation for interactive elements.

## Shapes

The shape language is defined by **Rounded** corners to evoke a sense of approachability and modern healthcare. 

- **Standard Elements (Buttons, Inputs):** 0.5rem (8px).
- **Cards & Containers:** 1rem (16px).
- **Full-Bleed Modal Overlays:** 1.5rem (24px) top corners.
- **Interactive Chips:** Fully rounded (pill-shaped) to distinguish them from actionable buttons.

## Components

### Buttons
- **Primary:** Guardian Blue background, white text. High-contrast, sharp, and authoritative.
- **Secondary:** Life Teal ghost buttons with 1.5px borders.
- **Urgent:** Emergency Red background, white text; used only for critical overrides or alerts.

### Cards & Bio-Containers
Cards are the primary container for HealthTwin data. They should feature a subtle gradient border and use Glassmorphism for "secondary" info within the card.

### Input Fields
Inputs use a white background with a Soft Slate border. On focus, the border transitions to Life Teal with a subtle 4px outer glow of the same color to indicate active "Health Monitoring" mode.

### Health Status Chips
Pill-shaped indicators using the secondary and tertiary colors. They should always include a small 8px circular "pulse" icon to signify real-time data streaming.

### Biometric Charts
Charts should utilize Life Teal for "Normal" ranges and transition to a glowing "Digital Blue" gradient. Critical thresholds are marked with an Emergency Red dashed line.
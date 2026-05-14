import type { CSSProperties } from 'react';

/**
 * Dark-first premium fintech dashboard tokens.
 * Surfaces: canvas → app → card → elevated nested tiles.
 */
export const tokens = {
  colors: {
    /** Main canvas (use with gradient from `backgroundDeep` in shell CSS) */
    background: '#07090d',
    backgroundDeep: '#050607',
    /** App / in-card plane under nested content */
    surfaceMuted: '#0b0e13',
    /** Card / panel surface */
    surface: '#11151c',
    /** Nested tiles, dense rows, stat chips */
    surfaceElevated: '#151a22',
    /** Primary copy — near-white on dark canvas */
    text: '#f4f7fa',
    /** Secondary body copy, card descriptions, helper lines */
    textMuted: '#c4cad3',
    /** Muted labels, form hints, table chrome */
    textSubtle: '#9aa3af',
    /** Uppercase meta, chevrons, placeholders — only when de-emphasized */
    textQuiet: '#7e8794',
    border: 'rgba(255, 255, 255, 0.07)',
    borderStrong: 'rgba(20, 184, 166, 0.48)',
    /** Brand primary accent */
    primary: '#48e0cc',
    primaryHover: '#5cf0dc',
    /** Deep teal for rings and strong emphasis */
    tealDeep: '#14b8a6',
    /** Text on filled primary buttons */
    onPrimary: '#050607',
    /** Softer teal for secondary highlights (eyebrows, badge copy) */
    accent: '#8eecdf',
    /** Semantic accents */
    growth: '#35d07f',
    warning: '#f2b84b',
    risk: '#ef5f57',
    data: '#4c8dff',
    sidebar: '#050607',
    sidebarText: '#c4cad3',
    sidebarTextStrong: '#f4f7fa',
    sidebarTitle: '#f4f7fa',
    sidebarNavActiveBg: 'rgba(255, 255, 255, 0.07)',
    sidebarNavActiveBorder: 'rgba(20, 184, 166, 0.38)',
    sidebarDivider: 'rgba(255, 255, 255, 0.08)',
    focus: 'rgba(72, 224, 204, 0.45)',
    /** Soft teal wash for row / list hover */
    rowHover: 'rgba(72, 224, 204, 0.25)',
    calloutWarningBg: 'rgba(242, 184, 75, 0.1)',
    calloutWarningBorder: 'rgba(242, 184, 75, 0.38)',
    calloutWarningText: '#f5c76f'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 40,
    /** Primary `Card` / bento panel interior padding */
    card: 36
  },
  radii: {
    sm: 8,
    /** Inputs, tooltips, nested controls (14–18px band) */
    md: 14,
    /** Nested cards, buckets, chips */
    lg: 18,
    /** Major dashboard cards & table shells (22–28px band) */
    bento: 24,
    /** Full pill for buttons and pill controls */
    pill: 999
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    /**
     * Type scale (dashboard / terminal UI):
     * - xs–sm: small controls (12–14px)
     * - md–lg: inputs & buttons (14–18px)
     * - xl: card & section titles (22–28px band → 24)
     * - xxl: large dashboard / page panels (28–32px band → 30)
     * - display: rail / product lockup line (28px)
     */
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
      xxl: 30,
      display: 28
    },
    lineHeight: {
      tight: 1.15,
      normal: 1.5,
      relaxed: 1.6
    },
    fontWeight: {
      regular: 400,
      semibold: 600,
      bold: 700
    }
  },
  shadows: {
    card: '0 0 0 1px rgba(255, 255, 255, 0.075), 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
    /** Default cards: lift only, no teal glow */
    cardHover:
      '0 0 0 1px rgba(255, 255, 255, 0.11), 0 12px 36px rgba(0, 0, 0, 0.52)',
    /** Active / emphasis cards: soft teal glow at rest */
    cardEmphasis:
      '0 0 0 1px rgba(20, 184, 166, 0.28), 0 0 36px rgba(72, 224, 204, 0.22), 0 8px 28px rgba(0, 0, 0, 0.48)',
    cardEmphasisHover:
      '0 0 0 1px rgba(20, 184, 166, 0.4), 0 0 48px rgba(72, 224, 204, 0.28), 0 14px 40px rgba(0, 0, 0, 0.55)',
    focus: '0 0 0 3px rgba(72, 224, 204, 0.38)',
    surfaceInset: '0 1px 0 rgba(255, 255, 255, 0.06) inset',
    rowFloat: '0 10px 28px rgba(0, 0, 0, 0.45)',
    badgeInset: '0 1px 0 rgba(255, 255, 255, 0.05) inset'
  }
} as const;

export type Tokens = typeof tokens;

export const themeCssVariables = {
  '--ti-color-background': tokens.colors.background,
  '--ti-color-background-deep': tokens.colors.backgroundDeep,
  '--ti-color-surface': tokens.colors.surface,
  '--ti-color-surface-muted': tokens.colors.surfaceMuted,
  '--ti-color-surface-elevated': tokens.colors.surfaceElevated,
  '--ti-color-text': tokens.colors.text,
  '--ti-color-text-muted': tokens.colors.textMuted,
  '--ti-color-text-subtle': tokens.colors.textSubtle,
  '--ti-color-text-quiet': tokens.colors.textQuiet,
  '--ti-color-border': tokens.colors.border,
  '--ti-color-border-strong': tokens.colors.borderStrong,
  '--ti-color-primary': tokens.colors.primary,
  '--ti-color-primary-hover': tokens.colors.primaryHover,
  '--ti-color-on-primary': tokens.colors.onPrimary,
  '--ti-color-accent': tokens.colors.accent,
  '--ti-color-teal-deep': tokens.colors.tealDeep,
  '--ti-color-growth': tokens.colors.growth,
  '--ti-color-warning': tokens.colors.warning,
  '--ti-color-risk': tokens.colors.risk,
  '--ti-color-data': tokens.colors.data,
  '--ti-color-sidebar': tokens.colors.sidebar,
  '--ti-color-sidebar-text': tokens.colors.sidebarText,
  '--ti-color-sidebar-text-strong': tokens.colors.sidebarTextStrong,
  '--ti-color-sidebar-title': tokens.colors.sidebarTitle,
  '--ti-color-sidebar-nav-active-bg': tokens.colors.sidebarNavActiveBg,
  '--ti-color-sidebar-nav-active-border': tokens.colors.sidebarNavActiveBorder,
  '--ti-color-sidebar-divider': tokens.colors.sidebarDivider,
  '--ti-color-focus': tokens.colors.focus,
  '--ti-space-xs': `${tokens.spacing.xs}px`,
  '--ti-space-sm': `${tokens.spacing.sm}px`,
  '--ti-space-md': `${tokens.spacing.md}px`,
  '--ti-space-lg': `${tokens.spacing.lg}px`,
  '--ti-space-xl': `${tokens.spacing.xl}px`,
  '--ti-space-xxl': `${tokens.spacing.xxl}px`,
  '--ti-space-xxxl': `${tokens.spacing.xxxl}px`,
  '--ti-space-card': `${tokens.spacing.card}px`,
  '--ti-radius-sm': `${tokens.radii.sm}px`,
  '--ti-radius-md': `${tokens.radii.md}px`,
  '--ti-radius-lg': `${tokens.radii.lg}px`,
  '--ti-radius-bento': `${tokens.radii.bento}px`,
  '--ti-radius-pill': `${tokens.radii.pill}px`,
  '--ti-color-row-hover': tokens.colors.rowHover,
  '--ti-color-callout-warning-bg': tokens.colors.calloutWarningBg,
  '--ti-color-callout-warning-border': tokens.colors.calloutWarningBorder,
  '--ti-color-callout-warning-text': tokens.colors.calloutWarningText,
  '--ti-shadow-card': tokens.shadows.card,
  '--ti-shadow-card-hover': tokens.shadows.cardHover,
  '--ti-shadow-card-emphasis': tokens.shadows.cardEmphasis,
  '--ti-shadow-card-emphasis-hover': tokens.shadows.cardEmphasisHover,
  '--ti-shadow-focus': tokens.shadows.focus,
  '--ti-shadow-surface-inset': tokens.shadows.surfaceInset,
  '--ti-shadow-row-float': tokens.shadows.rowFloat,
  '--ti-font-size-xs': `${tokens.typography.fontSize.xs}px`,
  '--ti-font-size-sm': `${tokens.typography.fontSize.sm}px`,
  '--ti-font-size-md': `${tokens.typography.fontSize.md}px`,
  '--ti-font-size-lg': `${tokens.typography.fontSize.lg}px`,
  '--ti-font-size-xl': `${tokens.typography.fontSize.xl}px`,
  '--ti-font-size-xxl': `${tokens.typography.fontSize.xxl}px`,
  '--ti-font-size-display': `${tokens.typography.fontSize.display}px`,
  '--ti-font-family-sans': tokens.typography.fontFamily
} as CSSProperties;

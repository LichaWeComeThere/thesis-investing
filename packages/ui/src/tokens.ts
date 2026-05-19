import type { CSSProperties } from 'react';

export const tokens = {
  colors: {
    background: '#05080C',
    backgroundDeep: '#05080C',
    surface: '#111821',
    surfaceMuted: '#111821',
    surfaceElevated: '#16202B',
    surfaceSoft: '#1B2530',
    text: '#F4F7FA',
    textSection: '#E8EEF5',
    textMuted: '#9AA7B5',
    textSubtle: '#7F8B99',
    textQuiet: '#7F8B99',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(72, 224, 204, 0.45)',
    primary: '#48E0CC',
    primaryHover: '#5EEAD4',
    accent: '#5EEAD4',
    growth: '#35D07F',
    warning: '#F2B84B',
    risk: '#EF5F57',
    data: '#4C8DFF',
    onPrimary: '#03100F',
    sidebar: '#070B10',
    sidebarText: '#B7D7E0',
    sidebarTextStrong: '#5EEAD4',
    sidebarDivider: 'rgba(255, 255, 255, 0.09)',
    focus: 'rgba(72, 224, 204, 0.36)',
    rowHover: 'rgba(72, 224, 204, 0.075)',
    calloutWarningBg: 'rgba(242, 184, 75, 0.11)',
    calloutWarningBorder: 'rgba(242, 184, 75, 0.38)',
    calloutWarningText: '#F2B84B'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 40,
    card: 32
  },
  radii: {
    sm: 10,
    md: 16,
    lg: 20,
    bento: 26,
    pill: 999
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
      xxl: 32,
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
    card:
      '0 0 0 1px rgba(255, 255, 255, 0.045), 0 18px 50px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.045)',
    cardHover:
      '0 0 0 1px rgba(72, 224, 204, 0.2), 0 22px 58px rgba(0, 0, 0, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    cardEmphasis:
      '0 0 0 1px rgba(72, 224, 204, 0.28), 0 0 38px rgba(72, 224, 204, 0.14), 0 22px 58px rgba(0, 0, 0, 0.46)',
    focus: '0 0 0 3px rgba(72, 224, 204, 0.26)',
    surfaceInset: 'inset 0 1px 0 rgba(255, 255, 255, 0.045)',
    badgeInset: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)'
  }
} as const;

export type Tokens = typeof tokens;

export const themeCssVariables = {
  '--ti-color-background': tokens.colors.background,
  '--ti-color-background-deep': tokens.colors.backgroundDeep,
  '--ti-color-surface': tokens.colors.surface,
  '--ti-color-surface-muted': tokens.colors.surfaceMuted,
  '--ti-color-surface-elevated': tokens.colors.surfaceElevated,
  '--ti-color-surface-soft': tokens.colors.surfaceSoft,
  '--ti-color-text': tokens.colors.text,
  '--ti-color-text-section': tokens.colors.textSection,
  '--ti-color-text-muted': tokens.colors.textMuted,
  '--ti-color-text-subtle': tokens.colors.textSubtle,
  '--ti-color-text-quiet': tokens.colors.textQuiet,
  '--ti-color-border': tokens.colors.border,
  '--ti-color-border-strong': tokens.colors.borderStrong,
  '--ti-color-primary': tokens.colors.primary,
  '--ti-color-primary-hover': tokens.colors.primaryHover,
  '--ti-color-accent': tokens.colors.accent,
  '--ti-color-growth': tokens.colors.growth,
  '--ti-color-warning': tokens.colors.warning,
  '--ti-color-risk': tokens.colors.risk,
  '--ti-color-data': tokens.colors.data,
  '--ti-color-on-primary': tokens.colors.onPrimary,
  '--ti-color-sidebar': tokens.colors.sidebar,
  '--ti-color-sidebar-text': tokens.colors.sidebarText,
  '--ti-color-sidebar-text-strong': tokens.colors.sidebarTextStrong,
  '--ti-color-sidebar-divider': tokens.colors.sidebarDivider,
  '--ti-color-focus': tokens.colors.focus,
  '--ti-color-row-hover': tokens.colors.rowHover,
  '--ti-color-callout-warning-bg': tokens.colors.calloutWarningBg,
  '--ti-color-callout-warning-border': tokens.colors.calloutWarningBorder,
  '--ti-color-callout-warning-text': tokens.colors.calloutWarningText,
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
  '--ti-shadow-card': tokens.shadows.card,
  '--ti-shadow-card-hover': tokens.shadows.cardHover,
  '--ti-shadow-card-emphasis': tokens.shadows.cardEmphasis,
  '--ti-shadow-focus': tokens.shadows.focus,
  '--ti-shadow-surface-inset': tokens.shadows.surfaceInset,
  '--ti-shadow-badge-inset': tokens.shadows.badgeInset,
  '--ti-font-size-xs': `${tokens.typography.fontSize.xs}px`,
  '--ti-font-size-sm': `${tokens.typography.fontSize.sm}px`,
  '--ti-font-size-md': `${tokens.typography.fontSize.md}px`,
  '--ti-font-size-lg': `${tokens.typography.fontSize.lg}px`,
  '--ti-font-size-xl': `${tokens.typography.fontSize.xl}px`,
  '--ti-font-size-xxl': `${tokens.typography.fontSize.xxl}px`,
  '--ti-font-size-display': `${tokens.typography.fontSize.display}px`,
  '--ti-font-family-sans': tokens.typography.fontFamily
} as CSSProperties;

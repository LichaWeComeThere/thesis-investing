import type { CSSProperties } from 'react';

export const tokens = {
  colors: {
    background: '#eef3f6',
    surface: '#ffffff',
    surfaceMuted: '#f8fafb',
    text: '#17202a',
    textMuted: '#4f6270',
    textSubtle: '#526472',
    border: '#d8e1e6',
    borderStrong: '#b7d7df',
    primary: '#17746a',
    primaryHover: '#125f57',
    accent: '#8bd3c7',
    sidebar: '#17202a',
    sidebarText: '#c7d3dc',
    sidebarDivider: 'rgba(238, 243, 246, 0.14)',
    focus: '#8bd3c7'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 40
  },
  radii: {
    sm: 4,
    md: 8
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: {
      xs: 13,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 28,
      xxl: 34
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
    card: '0 18px 40px rgba(31, 41, 51, 0.08)',
    focus: '0 0 0 3px rgba(139, 211, 199, 0.65)'
  }
} as const;

export type Tokens = typeof tokens;

export const themeCssVariables = {
  '--ti-color-background': tokens.colors.background,
  '--ti-color-surface': tokens.colors.surface,
  '--ti-color-surface-muted': tokens.colors.surfaceMuted,
  '--ti-color-text': tokens.colors.text,
  '--ti-color-text-muted': tokens.colors.textMuted,
  '--ti-color-text-subtle': tokens.colors.textSubtle,
  '--ti-color-border': tokens.colors.border,
  '--ti-color-border-strong': tokens.colors.borderStrong,
  '--ti-color-primary': tokens.colors.primary,
  '--ti-color-primary-hover': tokens.colors.primaryHover,
  '--ti-color-accent': tokens.colors.accent,
  '--ti-color-sidebar': tokens.colors.sidebar,
  '--ti-color-sidebar-text': tokens.colors.sidebarText,
  '--ti-color-sidebar-divider': tokens.colors.sidebarDivider,
  '--ti-color-focus': tokens.colors.focus,
  '--ti-space-xs': `${tokens.spacing.xs}px`,
  '--ti-space-sm': `${tokens.spacing.sm}px`,
  '--ti-space-md': `${tokens.spacing.md}px`,
  '--ti-space-lg': `${tokens.spacing.lg}px`,
  '--ti-space-xl': `${tokens.spacing.xl}px`,
  '--ti-space-xxl': `${tokens.spacing.xxl}px`,
  '--ti-space-xxxl': `${tokens.spacing.xxxl}px`,
  '--ti-radius-sm': `${tokens.radii.sm}px`,
  '--ti-radius-md': `${tokens.radii.md}px`,
  '--ti-shadow-card': tokens.shadows.card,
  '--ti-shadow-focus': tokens.shadows.focus,
  '--ti-font-family-sans': tokens.typography.fontFamily
} as CSSProperties;

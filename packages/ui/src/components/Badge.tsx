import type { HTMLAttributes, PropsWithChildren } from 'react';
import { tokens } from '../tokens';

export type BadgeVariant =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'risk';

export type BadgeProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
  }
>;

const badgeStyles: Record<
  BadgeVariant,
  { background: string; color: string; border: string }
> = {
  neutral: {
    background: `color-mix(in srgb, ${tokens.colors.surfaceMuted} 92%, ${tokens.colors.surface})`,
    color: tokens.colors.textSubtle,
    border: `1px solid ${tokens.colors.border}`
  },
  accent: {
    background: `color-mix(in srgb, ${tokens.colors.primary} 22%, ${tokens.colors.surface})`,
    color: tokens.colors.accent,
    border: `1px solid color-mix(in srgb, ${tokens.colors.primary} 35%, ${tokens.colors.border})`
  },
  success: {
    background: `color-mix(in srgb, ${tokens.colors.growth} 20%, ${tokens.colors.surface})`,
    color: tokens.colors.growth,
    border: `1px solid color-mix(in srgb, ${tokens.colors.growth} 38%, ${tokens.colors.border})`
  },
  warning: {
    background: tokens.colors.calloutWarningBg,
    color: tokens.colors.calloutWarningText,
    border: `1px solid ${tokens.colors.calloutWarningBorder}`
  },
  risk: {
    background: `color-mix(in srgb, ${tokens.colors.risk} 18%, ${tokens.colors.surface})`,
    color: tokens.colors.risk,
    border: `1px solid color-mix(in srgb, ${tokens.colors.risk} 42%, ${tokens.colors.border})`
  }
};

export function Badge({
  children,
  className,
  style,
  variant = 'neutral',
  ...spanProps
}: BadgeProps): JSX.Element {
  return (
    <span
      {...spanProps}
      className={['ti-badge', className].filter(Boolean).join(' ')}
      style={{
        alignItems: 'center',
        background: badgeStyles[variant].background,
        border: badgeStyles[variant].border,
        boxShadow: tokens.shadows.badgeInset,
        color: badgeStyles[variant].color,
        display: 'inline-flex',
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.bold,
        letterSpacing: '0.04em',
        lineHeight: tokens.typography.lineHeight.normal,
        minHeight: 26,
        padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
        ...style
      }}
    >
      {children}
    </span>
  );
}

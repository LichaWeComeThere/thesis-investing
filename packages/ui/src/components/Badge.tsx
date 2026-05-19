import type { HTMLAttributes, PropsWithChildren } from 'react';
import { tokens } from '../tokens';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'risk';

export type BadgeProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
  }
>;

const badgeStyles: Record<
  BadgeVariant,
  { background: string; border: string; color: string }
> = {
  neutral: {
    background: 'rgba(255, 255, 255, 0.045)',
    border: `1px solid ${tokens.colors.border}`,
    color: tokens.colors.textSubtle
  },
  accent: {
    background: `color-mix(in srgb, ${tokens.colors.primary} 18%, transparent)`,
    border: `1px solid color-mix(in srgb, ${tokens.colors.primary} 34%, ${tokens.colors.border})`,
    color: tokens.colors.accent
  },
  success: {
    background: `color-mix(in srgb, ${tokens.colors.growth} 17%, transparent)`,
    border: `1px solid color-mix(in srgb, ${tokens.colors.growth} 34%, ${tokens.colors.border})`,
    color: tokens.colors.growth
  },
  warning: {
    background: tokens.colors.calloutWarningBg,
    border: `1px solid ${tokens.colors.calloutWarningBorder}`,
    color: tokens.colors.calloutWarningText
  },
  risk: {
    background: `color-mix(in srgb, ${tokens.colors.risk} 16%, transparent)`,
    border: `1px solid color-mix(in srgb, ${tokens.colors.risk} 36%, ${tokens.colors.border})`,
    color: tokens.colors.risk
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
      className={['ti-badge', `ti-badge--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      style={{
        alignItems: 'center',
        background: badgeStyles[variant].background,
        border: badgeStyles[variant].border,
        borderRadius: tokens.radii.pill,
        boxShadow: tokens.shadows.badgeInset,
        color: badgeStyles[variant].color,
        display: 'inline-flex',
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.bold,
        letterSpacing: '0.04em',
        lineHeight: tokens.typography.lineHeight.normal,
        minHeight: 26,
        padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
        textTransform: 'uppercase',
        ...style
      }}
    >
      {children}
    </span>
  );
}

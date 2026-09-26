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
    background: tokens.colors.surfaceMuted,
    border: `1px solid ${tokens.colors.border}`,
    color: tokens.colors.textSubtle
  },
  accent: {
    background: `color-mix(in srgb, ${tokens.colors.primary} 8%, white)`,
    border: `1px solid color-mix(in srgb, ${tokens.colors.primary} 20%, ${tokens.colors.border})`,
    color: tokens.colors.accent
  },
  success: {
    background: `color-mix(in srgb, ${tokens.colors.growth} 8%, white)`,
    border: `1px solid color-mix(in srgb, ${tokens.colors.growth} 20%, ${tokens.colors.border})`,
    color: tokens.colors.growth
  },
  warning: {
    background: tokens.colors.calloutWarningBg,
    border: `1px solid ${tokens.colors.calloutWarningBorder}`,
    color: tokens.colors.calloutWarningText
  },
  risk: {
    background: `color-mix(in srgb, ${tokens.colors.risk} 7%, white)`,
    border: `1px solid color-mix(in srgb, ${tokens.colors.risk} 20%, ${tokens.colors.border})`,
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
        borderRadius: tokens.radii.sm,
        boxShadow: tokens.shadows.badgeInset,
        color: badgeStyles[variant].color,
        display: 'inline-flex',
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.semibold,
        letterSpacing: 0,
        lineHeight: tokens.typography.lineHeight.normal,
        minHeight: 24,
        padding: `2px ${tokens.spacing.sm}px`,
        textTransform: 'none',
        ...style
      }}
    >
      {children}
    </span>
  );
}

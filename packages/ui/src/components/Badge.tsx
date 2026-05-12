import type { HTMLAttributes, PropsWithChildren } from 'react';
import { tokens } from '../tokens';

export type BadgeVariant = 'neutral' | 'accent' | 'success';

export type BadgeProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
  }
>;

const badgeStyles: Record<BadgeVariant, { background: string; color: string }> = {
  neutral: {
    background: tokens.colors.surfaceMuted,
    color: tokens.colors.textSubtle
  },
  accent: {
    background: '#dff5f1',
    color: tokens.colors.primary
  },
  success: {
    background: '#e7f6ea',
    color: '#287a3e'
  }
};

export function Badge({
  children,
  style,
  variant = 'neutral',
  ...spanProps
}: BadgeProps): JSX.Element {
  return (
    <span
      {...spanProps}
      style={{
        alignItems: 'center',
        background: badgeStyles[variant].background,
        borderRadius: tokens.radii.sm,
        color: badgeStyles[variant].color,
        display: 'inline-flex',
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.bold,
        lineHeight: tokens.typography.lineHeight.normal,
        minHeight: 28,
        padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
        ...style
      }}
    >
      {children}
    </span>
  );
}

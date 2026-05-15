import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { tokens } from '../tokens';

export type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    title?: string;
    eyebrow?: string;
    footer?: ReactNode;
  }
>;

export function Card({
  children,
  eyebrow,
  footer,
  style,
  title,
  ...sectionProps
}: CardProps): JSX.Element {
  return (
    <section
      {...sectionProps}
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radii.md,
        boxShadow: tokens.shadows.card,
        padding: tokens.spacing.xxl,
        ...style
      }}
    >
      {eyebrow ? (
        <p
          style={{
            color: tokens.colors.primary,
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.bold,
            lineHeight: tokens.typography.lineHeight.normal,
            margin: `0 0 ${tokens.spacing.sm}px`,
            textTransform: 'uppercase'
          }}
        >
          {eyebrow}
        </p>
      ) : null}

      {title ? (
        <h2
          style={{
            color: tokens.colors.text,
            fontSize: tokens.typography.fontSize.xl,
            lineHeight: tokens.typography.lineHeight.tight,
            margin: 0
          }}
        >
          {title}
        </h2>
      ) : null}

      <div
        style={{
          color: tokens.colors.textMuted,
          fontSize: tokens.typography.fontSize.lg,
          lineHeight: tokens.typography.lineHeight.relaxed,
          marginTop: title || eyebrow ? tokens.spacing.lg : 0
        }}
      >
        {children}
      </div>

      {footer ? (
        <div
          style={{
            borderTop: `1px solid ${tokens.colors.border}`,
            marginTop: tokens.spacing.xl,
            paddingTop: tokens.spacing.lg
          }}
        >
          {footer}
        </div>
      ) : null}
    </section>
  );
}

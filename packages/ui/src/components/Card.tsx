import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { tokens } from '../tokens';

export type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    title?: string;
    eyebrow?: string;
    footer?: ReactNode;
    /** Primary / high-attention surface: soft teal glow (not used on every card). */
    emphasis?: boolean;
  }
>;

export function Card({
  children,
  emphasis = false,
  eyebrow,
  footer,
  style,
  title,
  className,
  ...sectionProps
}: CardProps): JSX.Element {
  const sectionClassName = [
    'ti-card',
    emphasis ? 'ti-card--emphasis' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      {...sectionProps}
      className={sectionClassName}
      style={{
        padding: tokens.spacing.card,
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
              fontWeight: tokens.typography.fontWeight.bold,
              letterSpacing: '-0.02em',
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
          fontSize: tokens.typography.fontSize.md,
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

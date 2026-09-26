import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { tokens } from '../tokens';

export type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    title?: string;
    eyebrow?: string;
    footer?: ReactNode;
    emphasis?: boolean;
  }
>;

export function Card({
  children,
  className,
  emphasis = false,
  eyebrow,
  footer,
  style,
  title,
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
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radii.bento,
        boxShadow: emphasis ? tokens.shadows.cardEmphasis : tokens.shadows.card,
        padding: tokens.spacing.card,
        transition:
          'border-color 160ms ease',
        ...style
      }}
    >
      {eyebrow ? (
        <p
          className="ti-card__eyebrow"
          style={{
            color: tokens.colors.textMuted,
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.semibold,
            letterSpacing: 0,
            lineHeight: tokens.typography.lineHeight.normal,
            margin: `0 0 ${tokens.spacing.sm}px`,
            textTransform: 'none'
          }}
        >
          {eyebrow}
        </p>
      ) : null}

      {title ? (
        <h2
          className="ti-card__title"
          style={{
            color: tokens.colors.textSection,
            fontSize: tokens.typography.fontSize.lg,
            fontWeight: tokens.typography.fontWeight.semibold,
            lineHeight: tokens.typography.lineHeight.tight,
            margin: 0
          }}
        >
          {title}
        </h2>
      ) : null}

      <div
        className="ti-card__body"
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
          className="ti-card__footer"
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

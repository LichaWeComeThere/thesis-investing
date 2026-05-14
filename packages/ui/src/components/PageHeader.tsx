import type { ReactNode } from 'react';
import { tokens } from '../tokens';

export type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  actions,
  badge,
  description,
  eyebrow,
  title
}: PageHeaderProps): JSX.Element {
  return (
    <header
      style={{
        alignItems: 'flex-start',
        display: 'flex',
        gap: tokens.spacing.xl,
        justifyContent: 'space-between'
      }}
    >
      <div>
        {eyebrow ? (
          <p
            style={{
              color: tokens.colors.textSubtle,
              fontSize: tokens.typography.fontSize.xs,
              fontWeight: tokens.typography.fontWeight.bold,
              lineHeight: tokens.typography.lineHeight.normal,
              margin: `0 0 ${tokens.spacing.sm}px`
            }}
          >
            {eyebrow}
          </p>
        ) : null}

        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: tokens.spacing.md
          }}
        >
          <h1
            style={{
              color: tokens.colors.text,
              fontSize: tokens.typography.fontSize.xxl,
              fontWeight: tokens.typography.fontWeight.bold,
              letterSpacing: '-0.03em',
              lineHeight: tokens.typography.lineHeight.tight,
              margin: 0
            }}
          >
            {title}
          </h1>
          {badge}
        </div>

        {description ? (
          <p
            style={{
              color: tokens.colors.textMuted,
              fontSize: tokens.typography.fontSize.lg,
              lineHeight: tokens.typography.lineHeight.relaxed,
              margin: `${tokens.spacing.lg}px 0 0`,
              maxWidth: 760
            }}
          >
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div>{actions}</div> : null}
    </header>
  );
}

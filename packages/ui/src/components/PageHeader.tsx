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
      className="ti-page-header"
      style={{
        alignItems: 'flex-start',
        display: 'flex',
        flexWrap: 'wrap',
        gap: tokens.spacing.xl,
        justifyContent: 'space-between',
        width: '100%'
      }}
    >
      <div
        className="ti-page-header__copy"
        style={{ flex: '1 1 320px', minWidth: 0 }}
      >
        {eyebrow ? (
          <p
            className="ti-page-header__eyebrow"
            style={{
              color: tokens.colors.textSubtle,
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

        <div
          className="ti-page-header__title-row"
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
              fontWeight: tokens.typography.fontWeight.semibold,
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
              fontSize: tokens.typography.fontSize.md,
              lineHeight: tokens.typography.lineHeight.relaxed,
              margin: `10px 0 0`,
              maxWidth: 660
            }}
          >
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div
          className="ti-page-header__actions"
          style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing.sm }}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

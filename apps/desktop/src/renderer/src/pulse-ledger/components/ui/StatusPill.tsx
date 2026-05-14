import type { HTMLAttributes, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
  className?: string;
} & HTMLAttributes<HTMLSpanElement>;

const toneClass: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'bg-pl-muted text-pl-ink ring-pl-border-muted',
  positive: 'bg-pl-teal/15 text-pl-teal ring-pl-teal/30',
  negative: 'bg-pl-coralsoft text-pl-coral ring-pl-coral/25',
  warning: 'bg-pl-amber-soft text-pl-amber-ink ring-pl-amber/30'
};

export function StatusPill({ children, tone = 'neutral', className = '', ...rest }: Props): JSX.Element {
  return (
    <span className={`pl-badge-chip ring-1 ${toneClass[tone]} ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}

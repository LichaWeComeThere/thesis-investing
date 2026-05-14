import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'premium' | 'bento' | 'flat';

const variantShell: Record<CardVariant, string> = {
  premium: 'pl-premium-card',
  bento: 'pl-bento-section',
  flat: ''
};

type Props = {
  variant?: CardVariant;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function Card({ variant = 'premium', className = '', children, ...rest }: Props): JSX.Element {
  const shell = variantShell[variant];
  const surface =
    variant === 'flat'
      ? 'rounded-[24px] border border-pl-border bg-pl-card shadow-card sm:rounded-[28px]'
      : 'rounded-[24px] border border-pl-border bg-pl-card sm:rounded-[28px]';
  return (
    <div className={`${shell} ${surface} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

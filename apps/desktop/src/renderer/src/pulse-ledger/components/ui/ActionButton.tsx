import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonTransitionClass } from '../../animations';

type Variant = 'primary' | 'secondary' | 'ghost' | 'teal';

type Props = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantClass: Record<Variant, string> = {
  primary:
    'rounded-2xl bg-pl-teal px-4 py-2.5 text-sm font-semibold text-pl-ink shadow-cta-hero hover:brightness-110 hover:shadow-[0_14px_36px_rgba(72,224,204,0.38)] active:translate-y-px',
  secondary:
    'rounded-2xl border border-pl-border-strong bg-pl-card px-4 py-2.5 text-sm font-semibold text-pl-ink hover:border-pl-teal/40 hover:brightness-[1.03] hover:shadow-card',
  ghost:
    'rounded-2xl border border-dashed border-pl-border-strong py-2 text-xs font-semibold text-pl-slate hover:text-pl-ink',
  teal: 'rounded-2xl bg-pl-teal/90 px-5 py-3 text-sm font-semibold text-pl-ink shadow-sm hover:bg-pl-teal hover:shadow-card active:translate-y-px'
};

export function ActionButton({
  variant = 'secondary',
  className = '',
  children,
  type = 'button',
  ...rest
}: Props): JSX.Element {
  return (
    <button type={type} className={`${variantClass[variant]} ${buttonTransitionClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

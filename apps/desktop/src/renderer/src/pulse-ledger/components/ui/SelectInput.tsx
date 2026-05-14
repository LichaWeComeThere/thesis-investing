import type { SelectHTMLAttributes } from 'react';

type Props = {
  className?: string;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectInput({ className = '', children, ...rest }: Props): JSX.Element {
  return (
    <select
      className={`rounded-2xl border border-pl-border-strong bg-pl-card px-3 py-2 text-xs font-semibold text-pl-ink shadow-sm outline-none transition-all duration-200 hover:border-pl-border-strong focus:border-pl-teal/40 focus:ring-4 focus:ring-pl-teal/20 ${className}`.trim()}
      {...rest}
    >
      {children}
    </select>
  );
}

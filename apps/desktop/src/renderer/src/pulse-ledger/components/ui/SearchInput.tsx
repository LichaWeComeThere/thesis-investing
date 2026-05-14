import type { InputHTMLAttributes } from 'react';

type Props = {
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function SearchInput({ className = '', ...rest }: Props): JSX.Element {
  return (
    <input
      className={`w-full rounded-2xl border border-pl-border-strong bg-pl-muted/25 px-4 py-3 text-sm text-pl-ink shadow-sm outline-none transition-all duration-200 ease-out placeholder:text-pl-mist focus:border-pl-teal/40 focus:bg-pl-input-focus focus:ring-4 focus:ring-pl-teal/25 ${className}`.trim()}
      {...rest}
    />
  );
}

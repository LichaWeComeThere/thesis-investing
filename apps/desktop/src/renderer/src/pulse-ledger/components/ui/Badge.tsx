import type { HTMLAttributes, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>;

export function Badge({ children, className = '', ...rest }: Props): JSX.Element {
  return (
    <span className={`pl-badge-chip ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}

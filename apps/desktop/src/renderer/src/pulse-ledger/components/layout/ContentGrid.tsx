import type { ReactNode } from 'react';
import { contentGridClass } from '../../animations';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Primary 12-column responsive dashboard grid. */
export function ContentGrid({ children, className = '' }: Props): JSX.Element {
  return <div className={`${contentGridClass} ${className}`.trim()}>{children}</div>;
}

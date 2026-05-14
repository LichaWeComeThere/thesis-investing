import type { ReactNode } from 'react';
import { SectionHeader } from '../ui/SectionHeader';

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/** Page-level title block (uses `SectionHeader`). */
export function PageHeader(props: Props): JSX.Element {
  return <SectionHeader {...props} />;
}

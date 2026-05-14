import type { FieldSource } from '../../score-stock/model';
import { sourceBadgeClass, sourceLabel } from '../../score-stock/sourceBadges';

type Props = {
  source: FieldSource;
  edited?: boolean;
  className?: string;
};

export function DataSourceBadge({ source, edited, className = '' }: Props): JSX.Element {
  return (
    <span className={`pl-badge-chip tracking-wide ${sourceBadgeClass(source)} ${className}`.trim()}>
      {sourceLabel(source)}
      {edited ? <span className="ml-1.5 text-pl-coral">Edited</span> : null}
    </span>
  );
}

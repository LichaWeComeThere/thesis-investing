import type { FieldEntry } from '../../score-stock/model';
import { DataSourceBadge } from '../ui/DataSourceBadge';

export function FieldSourceIndicator({ entry }: { entry: FieldEntry }): JSX.Element {
  return <DataSourceBadge source={entry.source} edited={entry.manualOverride} />;
}

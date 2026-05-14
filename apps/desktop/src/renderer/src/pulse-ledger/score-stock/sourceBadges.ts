import type { FieldSource } from './model';

export function sourceBadgeClass(s: FieldSource): string {
  switch (s) {
    case 'polygon':
      return 'bg-pl-teal/15 text-pl-teal ring-1 ring-pl-teal/30';
    case 'alpha_vantage':
      return 'bg-pl-blue-muted text-pl-blue ring-1 ring-pl-blue/25';
    case 'manual':
      return 'bg-pl-teal-muted text-pl-teal-deep ring-1 ring-pl-teal/35';
    case 'demo':
      return 'bg-pl-green-muted text-pl-green ring-1 ring-pl-green/30';
    default:
      return 'bg-pl-muted text-pl-mist ring-1 ring-pl-border-muted';
  }
}

export function sourceLabel(s: FieldSource): string {
  switch (s) {
    case 'polygon':
      return 'Polygon';
    case 'alpha_vantage':
      return 'Alpha Vantage';
    case 'manual':
      return 'Manual';
    case 'demo':
      return 'Demo';
    default:
      return 'Missing';
  }
}

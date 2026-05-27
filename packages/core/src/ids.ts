import type { EntityId } from './domain';

export type IdPrefix =
  | 'idea'
  | 'decision'
  | 'stock'
  | 'portfolio'
  | 'portfolio-ranker'
  | 'holding'
  | 'watchlist'
  | 'thesis'
  | 'score'
  | 'basket'
  | 'reminder';

export function createId(
  prefix: IdPrefix,
  seed: string | number | readonly (string | number)[]
): EntityId {
  const normalizedSeed = Array.isArray(seed)
    ? seed.map((value) => String(value).trim()).join('|')
    : String(seed).trim();

  return `${prefix}_${stableHash(`${prefix}:${normalizedSeed}`)}`;
}

function stableHash(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).padStart(7, '0');
}

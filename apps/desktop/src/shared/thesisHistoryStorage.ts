import type { LivingThesisHistory } from '@thesis-investing/core';

export const thesisHistoryStorageChannels = { get: 'thesis-history:get' } as const;

export type ThesisHistoryStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: readonly string[] };

/** A derived read view; history has no independent save or mutation endpoint. */
export type ThesisHistoryStorageApi = {
  get(thesisId: string): Promise<ThesisHistoryStorageResult<LivingThesisHistory>>;
};

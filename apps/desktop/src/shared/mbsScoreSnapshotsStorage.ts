import type { MbsScoreSnapshot } from '@thesis-investing/core';

export const mbsScoreSnapshotsStorageChannels = {
  list: 'mbs-score-snapshots:list',
  save: 'mbs-score-snapshots:save'
} as const;

export type MbsScoreSnapshotsStorageResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type MbsScoreSnapshotsStorageApi = {
  list(): Promise<MbsScoreSnapshotsStorageResult<MbsScoreSnapshot[]>>;
  save(
    snapshot: MbsScoreSnapshot
  ): Promise<MbsScoreSnapshotsStorageResult<MbsScoreSnapshot>>;
};

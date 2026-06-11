export const localDataStorageChannels = {
  get: 'local-data:get'
} as const;

export type LocalDataInfo = {
  databaseFileExists: boolean;
  databasePath: string;
  generatedAt: string;
  localOnlyItems: string[];
  persistedWorkflows: string[];
  storageAdapter: 'node:sqlite';
  userDataPath: string;
};

export type LocalDataStorageResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type LocalDataStorageApi = {
  get(): Promise<LocalDataStorageResult<LocalDataInfo>>;
};

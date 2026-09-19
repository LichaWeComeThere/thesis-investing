import { thesisHistoryStorageChannels as channels, type ThesisHistoryStorageApi } from '../shared/thesisHistoryStorage';
import type { IpcInvoke } from './livingThesesPreload';

export function createThesisHistoryPreloadApi(invoke: IpcInvoke): ThesisHistoryStorageApi {
  return { get: (thesisId) => invoke(channels.get, thesisId) as ReturnType<ThesisHistoryStorageApi['get']> };
}

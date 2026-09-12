import { decisionsStorageChannels as channels, type DecisionsStorageApi } from '../shared/decisionsStorage';
import type { IpcInvoke } from './livingThesesPreload';

export function createDecisionsPreloadApi(invoke: IpcInvoke): DecisionsStorageApi {
  return {
    list: (thesisId) => invoke(channels.list, thesisId) as ReturnType<DecisionsStorageApi['list']>,
    listCompletedReviews: (thesisId) => invoke(channels.listCompletedReviews, thesisId) as ReturnType<DecisionsStorageApi['listCompletedReviews']>,
    create: (thesisId, input, requestId) => invoke(channels.create, thesisId, input, requestId) as ReturnType<DecisionsStorageApi['create']>
  };
}

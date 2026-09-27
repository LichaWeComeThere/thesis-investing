import {
  reviewQueueStorageChannels,
  type ReviewQueueStorageApi
} from '../shared/reviewQueueStorage';
import type { IpcInvoke } from './livingThesesPreload';

export function createReviewQueuePreloadApi(invoke: IpcInvoke): ReviewQueueStorageApi {
  return {
    get: (today) => invoke(reviewQueueStorageChannels.get, today) as ReturnType<
      ReviewQueueStorageApi['get']
    >
  };
}

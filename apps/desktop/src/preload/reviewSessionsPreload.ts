import { reviewSessionsStorageChannels as channels, type ReviewSessionsStorageApi } from '../shared/reviewSessionsStorage';
import type { IpcInvoke } from './livingThesesPreload';

export function createReviewSessionsPreloadApi(invoke: IpcInvoke): ReviewSessionsStorageApi {
  return {
    getActive: (id) => invoke(channels.getActive, id) as ReturnType<ReviewSessionsStorageApi['getActive']>,
    start: (id) => invoke(channels.start, id) as ReturnType<ReviewSessionsStorageApi['start']>,
    resume: (id) => invoke(channels.resume, id) as ReturnType<ReviewSessionsStorageApi['resume']>,
    complete: (id, workflow, version) => invoke(channels.complete, id, workflow, version) as ReturnType<ReviewSessionsStorageApi['complete']>,
    saveDraft: (id, workflow, version) => invoke(channels.saveDraft, id, workflow, version) as ReturnType<ReviewSessionsStorageApi['saveDraft']>
  };
}

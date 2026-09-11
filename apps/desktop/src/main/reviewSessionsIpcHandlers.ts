import type { createReviewSessionStorageService } from './reviewSessionStorageService';

type Service = ReturnType<typeof createReviewSessionStorageService>;
const invalid = () => ({ ok: false as const, errors: ['The review request is invalid. Reopen the review and try again.'] });
const isId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Validate untrusted renderer arguments before they reach storage. */
export function createReviewSessionsIpcHandlers(service: Service) {
  return {
    getActive: (id: unknown) => isId(id) ? service.getActive(id) : Promise.resolve(invalid()),
    start: (id: unknown) => isId(id) ? service.start(id) : Promise.resolve(invalid()),
    resume: (id: unknown) => isId(id) ? service.resume(id) : Promise.resolve(invalid()),
    complete: (id: unknown, workflow: unknown, version: unknown) => {
      if (!isId(id) || typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
        return Promise.resolve(invalid());
      }
      return service.complete(id, workflow, version);
    },
    saveDraft: (id: unknown, workflow: unknown, version: unknown) => {
      if (!isId(id) || typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
        return Promise.resolve(invalid());
      }
      // The service parses the complete unknown workflow with owned session metadata.
      return service.saveDraft(id, workflow, version);
    }
  };
}

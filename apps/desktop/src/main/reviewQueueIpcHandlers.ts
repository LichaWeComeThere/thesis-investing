import { isValidIsoDate } from '@thesis-investing/core';
import type { createReviewQueueStorageService } from './reviewQueueStorageService';

type Service = ReturnType<typeof createReviewQueueStorageService>;

/** Accept only the local reference date; all queue data comes from storage. */
export function createReviewQueueIpcHandlers(service: Service) {
  return {
    get(today: unknown, ...extraArguments: readonly unknown[]) {
      if (
        typeof today !== 'string' ||
        !isValidIsoDate(today) ||
        extraArguments.length > 0
      ) {
        return Promise.resolve({
          ok: false as const,
          errors: ['Provide one valid local calendar date in YYYY-MM-DD format.']
        });
      }
      return service.get(today);
    }
  };
}

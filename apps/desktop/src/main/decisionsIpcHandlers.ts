import type { createDecisionsStorageService } from './decisionsStorageService';

type Service = ReturnType<typeof createDecisionsStorageService>;
const invalid = () => ({ ok: false as const, errors: ['The decision request is invalid. Reopen the thesis and try again.'] });
const isId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isRequestId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/** Validate untrusted renderer arguments before they reach local storage. */
export function createDecisionsIpcHandlers(service: Service) {
  return {
    list: (thesisId: unknown) => isId(thesisId) ? service.list(thesisId) : Promise.resolve(invalid()),
    listCompletedReviews: (thesisId: unknown) => isId(thesisId) ? service.listCompletedReviews(thesisId) : Promise.resolve(invalid()),
    create: (thesisId: unknown, input: unknown, requestId: unknown) => {
      if (!isId(thesisId) || !isRequestId(requestId)) return Promise.resolve(invalid());
      // The service parses all decision fields and owns the saved identity and timestamp.
      return service.create(thesisId, input, requestId);
    }
  };
}

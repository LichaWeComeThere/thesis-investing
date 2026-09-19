import type { createThesisHistoryStorageService } from './thesisHistoryStorageService';

type Service = ReturnType<typeof createThesisHistoryStorageService>;

/** Only one validated read operation is exposed to the renderer. */
export function createThesisHistoryIpcHandlers(service: Service) {
  return {
    get(thesisId: unknown) {
      if (typeof thesisId !== 'string' || thesisId.trim().length === 0) {
        return Promise.resolve({ ok: false as const, errors: ['Select a saved thesis to see its history.'] });
      }
      return service.get(thesisId);
    }
  };
}

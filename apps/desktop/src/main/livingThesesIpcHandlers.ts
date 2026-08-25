import type {
  CreateLivingThesisInput,
  UpdateLivingThesisInput
} from '../shared/livingThesesStorage';
import type { LivingThesesStorageService } from './livingThesesStorageService';

export function createLivingThesesIpcHandlers(
  service: LivingThesesStorageService
) {
  return {
    create: (input: CreateLivingThesisInput) => service.create(input),
    getById: (id: string) => service.getById(id),
    list: () => service.list(),
    update: (input: UpdateLivingThesisInput, expectedVersion: number) =>
      service.update(input, expectedVersion)
  };
}

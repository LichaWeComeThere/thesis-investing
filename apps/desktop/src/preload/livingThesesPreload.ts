import {
  livingThesesStorageChannels,
  type LivingThesesStorageApi
} from '../shared/livingThesesStorage';

export type IpcInvoke = (
  channel: string,
  ...args: readonly unknown[]
) => Promise<unknown>;

export function createLivingThesesPreloadApi(
  invoke: IpcInvoke
): LivingThesesStorageApi {
  return {
    create: (input) =>
      invoke(livingThesesStorageChannels.create, input) as ReturnType<
        LivingThesesStorageApi['create']
      >,
    getById: (id) =>
      invoke(livingThesesStorageChannels.getById, id) as ReturnType<
        LivingThesesStorageApi['getById']
      >,
    list: () =>
      invoke(livingThesesStorageChannels.list) as ReturnType<
        LivingThesesStorageApi['list']
      >,
    update: (input, expectedVersion) =>
      invoke(
        livingThesesStorageChannels.update,
        input,
        expectedVersion
      ) as ReturnType<LivingThesesStorageApi['update']>
  };
}

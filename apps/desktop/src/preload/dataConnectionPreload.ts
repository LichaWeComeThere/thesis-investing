import { dataConnectionChannels as channels, type DataConnectionApi, type CompanyDetailsApi } from '../shared/companyDetails';
import type { IpcInvoke } from './livingThesesPreload';

export function createDataConnectionPreloadApi(invoke: IpcInvoke): DataConnectionApi {
  return {
    status: () => invoke(channels.status) as ReturnType<DataConnectionApi['status']>,
    saveKey: (key) => invoke(channels.saveKey, key) as ReturnType<DataConnectionApi['saveKey']>,
    remove: () => invoke(channels.remove) as ReturnType<DataConnectionApi['remove']>
  };
}
export function createCompanyDetailsPreloadApi(invoke: IpcInvoke): CompanyDetailsApi {
  return {
    getCached: (id) => invoke(channels.getCached, id) as ReturnType<CompanyDetailsApi['getCached']>,
    refresh: (id) => invoke(channels.refresh, id) as ReturnType<CompanyDetailsApi['refresh']>
  };
}

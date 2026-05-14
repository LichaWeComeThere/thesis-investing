/** Per-provider row in the dev “Data sources” strip (UI only, not persisted). */
export type DevProviderLineStatus = 'live' | 'error' | 'mock' | 'standby';

export type DevDataSourceLine = {
  id: 'polygon' | 'alpha_vantage' | 'mock';
  label: string;
  status: DevProviderLineStatus;
};

export const INITIAL_DEV_DATA_SOURCE_LINES: DevDataSourceLine[] = [
  { id: 'polygon', label: 'Polygon', status: 'standby' },
  { id: 'alpha_vantage', label: 'Alpha Vantage', status: 'standby' },
  { id: 'mock', label: 'Mock / demo', status: 'standby' }
];

import { contextBridge, ipcRenderer } from 'electron';
import {
  watchlistStorageChannels,
  type ThesisInvestingApi
} from '../shared/watchlistStorage';

const thesisInvestingApi: ThesisInvestingApi = {
  platform: process.platform,
  watchlist: {
    list: () => ipcRenderer.invoke(watchlistStorageChannels.list),
    remove: (id) => ipcRenderer.invoke(watchlistStorageChannels.remove, id),
    save: (item) => ipcRenderer.invoke(watchlistStorageChannels.save, item)
  }
};

contextBridge.exposeInMainWorld('thesisInvesting', thesisInvestingApi);

import { contextBridge, ipcRenderer } from 'electron';
import { thesisNotesStorageChannels } from '../shared/thesisNotesStorage';
import {
  watchlistStorageChannels,
  type ThesisInvestingApi
} from '../shared/watchlistStorage';

const thesisInvestingApi: ThesisInvestingApi = {
  platform: process.platform,
  thesisNotes: {
    list: () => ipcRenderer.invoke(thesisNotesStorageChannels.list),
    save: (note) => ipcRenderer.invoke(thesisNotesStorageChannels.save, note)
  },
  watchlist: {
    list: () => ipcRenderer.invoke(watchlistStorageChannels.list),
    remove: (id) => ipcRenderer.invoke(watchlistStorageChannels.remove, id),
    save: (item) => ipcRenderer.invoke(watchlistStorageChannels.save, item)
  }
};

contextBridge.exposeInMainWorld('thesisInvesting', thesisInvestingApi);

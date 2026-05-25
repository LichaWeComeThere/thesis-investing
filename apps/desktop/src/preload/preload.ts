import { contextBridge, ipcRenderer } from 'electron';
import { remindersStorageChannels } from '../shared/remindersStorage';
import { thesisNotesStorageChannels } from '../shared/thesisNotesStorage';
import {
  watchlistStorageChannels,
  type ThesisInvestingApi
} from '../shared/watchlistStorage';

const thesisInvestingApi: ThesisInvestingApi = {
  platform: process.platform,
  reminders: {
    list: () => ipcRenderer.invoke(remindersStorageChannels.list),
    remove: (id) => ipcRenderer.invoke(remindersStorageChannels.remove, id),
    save: (reminder) => ipcRenderer.invoke(remindersStorageChannels.save, reminder)
  },
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

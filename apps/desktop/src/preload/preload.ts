import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('thesisInvesting', {
  platform: process.platform
});

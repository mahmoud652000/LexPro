import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  savePDF: (html: string, fileName: string) =>
    ipcRenderer.invoke('save-pdf', html, fileName),
  printDocument: (html: string) =>
    ipcRenderer.invoke('print-document', html),
  printFile: (url: string) =>
    ipcRenderer.invoke('print-file', url),
  openFile: (url: string, title: string) =>
    ipcRenderer.invoke('open-file', url, title),
  checkForUpdates: () =>
    ipcRenderer.invoke('check-for-updates'),
  installUpdate: () =>
    ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback: (status: any) => void) => {
    const handler = (_event: unknown, status: any) => callback(status);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
});

import { contextBridge, ipcRenderer } from "electron";

const desktopApi = {
  platform: process.platform,
  isDesktop: true,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
  openExternal: (url: string) => ipcRenderer.send("open-external", url),
};

contextBridge.exposeInMainWorld("maker", desktopApi);
contextBridge.exposeInMainWorld("electronAPI", desktopApi);

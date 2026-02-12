import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("makelr", {
  platform: process.platform,
  isDesktop: true,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
  openExternal: (url: string) => ipcRenderer.send("open-external", url),
});

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    log: (message) => ipcRenderer.send("log", message),
});

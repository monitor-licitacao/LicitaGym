import { contextBridge, ipcRenderer } from "electron";
const adminApi = {
  getStats: (accessToken) => ipcRenderer.invoke("admin:get-stats", accessToken),
  listUsuarios: (accessToken) => ipcRenderer.invoke("admin:list-usuarios", accessToken)
};
const authApi = {
  status: () => ipcRenderer.invoke("auth:status"),
  login: (login, senha) => ipcRenderer.invoke("auth:login", login, senha),
  validate: (token) => ipcRenderer.invoke("auth:validate", token),
  logout: (token) => ipcRenderer.invoke("auth:logout", token)
};
const providersApi = {
  catalog: () => ipcRenderer.invoke("providers:catalog"),
  list: () => ipcRenderer.invoke("providers:list"),
  upsert: (input) => ipcRenderer.invoke("providers:upsert", input),
  delete: (id) => ipcRenderer.invoke("providers:delete", id),
  resolve: (slug, modelId) => ipcRenderer.invoke("providers:resolve", slug, modelId)
};
const alertsApi = {
  list: () => ipcRenderer.invoke("alerts:list"),
  getConfig: () => ipcRenderer.invoke("alerts:config:get"),
  setConfig: (patch) => ipcRenderer.invoke("alerts:config:set", patch),
  markRead: (id) => ipcRenderer.invoke("alerts:mark-read", id),
  notifyComplete: (payload) => ipcRenderer.invoke("alerts:notify-complete", payload),
  cardMoved: (payload) => ipcRenderer.invoke("alerts:card-moved", payload),
  onPush: (cb) => {
    const listener = (_e, item) => cb(item);
    ipcRenderer.on("alerts:push", listener);
    return () => ipcRenderer.removeListener("alerts:push", listener);
  },
  onCardMovedRealtime: (cb) => {
    const listener = (_e, event) => cb(event);
    ipcRenderer.on("realtime:card-moved", listener);
    return () => ipcRenderer.removeListener("realtime:card-moved", listener);
  }
};
const syncsApi = {
  inventory: () => ipcRenderer.invoke("syncs:inventory"),
  getRun: (syncId) => ipcRenderer.invoke("syncs:get-run", syncId),
  invoke: (payload) => ipcRenderer.invoke("syncs:invoke", payload),
  watch: (syncId, slug, timeoutMs) => ipcRenderer.invoke("syncs:watch", syncId, slug, timeoutMs),
  unwatch: (syncId) => ipcRenderer.invoke("syncs:unwatch", syncId),
  listActive: () => ipcRenderer.invoke("syncs:list-active"),
  onRunUpdated: (cb) => {
    const listener = (_e, event) => cb(event);
    ipcRenderer.on("syncs:run-updated", listener);
    return () => ipcRenderer.removeListener("syncs:run-updated", listener);
  }
};
contextBridge.exposeInMainWorld("admin", adminApi);
contextBridge.exposeInMainWorld("auth", authApi);
contextBridge.exposeInMainWorld("providers", providersApi);
contextBridge.exposeInMainWorld("alerts", alertsApi);
contextBridge.exposeInMainWorld("syncs", syncsApi);

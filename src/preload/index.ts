import { contextBridge, ipcRenderer } from 'electron'

// renderer から呼び出せる API を定義
// contextBridge によりサンドボックスを維持しつつ安全に公開する

export type NasneRequestConfig = {
  ip: string
  port: number
  path: string
  method?: 'GET' | 'POST'
  body?: string
}

export type NasneResponse = {
  success: boolean
  data?: unknown
  error?: string
}

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * nasne へ HTTP リクエストを送る (main プロセス経由)
   */
  nasneRequest: (config: NasneRequestConfig): Promise<NasneResponse> =>
    ipcRenderer.invoke('nasne:request', config),

  /**
   * 外部 URL をデフォルトブラウザで開く
   */
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('shell:openExternal', url),

  /**
   * 外部 HTTPS GET リクエスト (NHK 番組表 API など)
   */
  externalGet: (url: string): Promise<NasneResponse> =>
    ipcRenderer.invoke('external:get', url)
})

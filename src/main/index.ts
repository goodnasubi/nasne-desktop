import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import http from 'http'
import https from 'https'

const isDev = !app.isPackaged

// ─────────────────────────────────────────────
// nasne への HTTP リクエストを Node.js から発行
// (renderer から直接叩くと CORS で弾かれるため IPC 経由にする)
// ─────────────────────────────────────────────
function nasneRequest(
  ip: string,
  port: number,
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: string
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // nasne の公式アプリ (PC TV Plus / torne) に近い User-Agent を送る。
    // 独自 User-Agent がないと 809 (未認証) を返す機種が存在する。
    const baseHeaders: http.OutgoingHttpHeaders = {
      'User-Agent': 'nasne_desktop/1.0 (Windows; nasne Desktop App)',
      'Accept': 'application/json, text/javascript, */*',
      'Accept-Language': 'ja,en;q=0.9',
      'Connection': 'keep-alive'
    }

    const options: http.RequestOptions = {
      hostname: ip,
      port,
      path,
      method,
      headers: { ...baseHeaders }
    }

    if (body && method === 'POST') {
      options.headers = {
        ...baseHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf-8')
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve(data)
        }
      })
    })

    req.on('error', (err: Error) => reject(err.message))

    req.setTimeout(8000, () => {
      req.destroy()
      reject('接続タイムアウト (8秒)')
    })

    if (body) req.write(body)
    req.end()
  })
}

// ─────────────────────────────────────────────
// BrowserWindow の作成
// ─────────────────────────────────────────────
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: '#1c1c1e',
    // macOS: トラフィックライトボタンをウィンドウ内に表示
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  // 外部リンクはデフォルトブラウザで開く
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // 開発時はデベロッパーツールを開く (必要なら)
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─────────────────────────────────────────────
// アプリライフサイクル
// ─────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─────────────────────────────────────────────
// 外部 HTTPS API へのリクエスト (NHK 番組表 API など)
// ─────────────────────────────────────────────
function externalGet(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'nasne_desktop/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => (data += chunk.toString()))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { resolve(data) }
      })
    })
    req.on('error', (err: Error) => reject(err.message))
    req.setTimeout(10000, () => { req.destroy(); reject('タイムアウト (10秒)') })
  })
}

// ─────────────────────────────────────────────
// IPC ハンドラ: 外部ブラウザを開く
// ─────────────────────────────────────────────
ipcMain.handle('shell:openExternal', (_event, url: string) => {
  shell.openExternal(url)
})

// ─────────────────────────────────────────────
// IPC ハンドラ: 外部 HTTPS GET リクエスト
// ─────────────────────────────────────────────
ipcMain.handle('external:get', async (_event, url: string) => {
  try {
    const data = await externalGet(url)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// ─────────────────────────────────────────────
// IPC ハンドラ: nasne API リクエスト
// ─────────────────────────────────────────────
ipcMain.handle(
  'nasne:request',
  async (
    _event,
    {
      ip,
      port,
      path,
      method,
      body
    }: {
      ip: string
      port: number
      path: string
      method?: 'GET' | 'POST'
      body?: string
    }
  ) => {
    try {
      const data = await nasneRequest(ip, port, path, method ?? 'GET', body)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
)

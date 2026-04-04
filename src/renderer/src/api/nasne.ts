// ─────────────────────────────────────────────
// nasne HTTP API クライアント
//
// 使用ポート:
//   64210  … ステータス系 (HDD 情報、ボックス状態など)
//   64220  … 録画・予約系 (タイトル一覧、予約管理など)
// ─────────────────────────────────────────────

export const STATUS_PORT = 64210
export const REMOTE_PORT = 64220

// ─── 型定義 ───────────────────────────────────

export type RecordedTitle = {
  id: string
  title: string
  startDateTime: string   // "YYYYMMDDHHmmss" 形式
  duration: number        // 秒
  serviceId?: string      // チャンネル ID
  chName?: string         // チャンネル名
  contentUrl?: string     // 再生 URL (DLNA)
  genre?: string
  description?: string
}

export type Reservation = {
  id: string
  title: string
  startDateTime: string
  duration: number          // 秒
  serviceId: string         // チャンネル ID
  chName?: string
  broadcastingType?: number // 1=地デジ, 2=BS, 3=CS
  quality: number           // 100=DR, 101=3倍
  conditionId: string       // "1"=単発, "d"=毎日, "w3"=毎週
  storageId?: number
}

export type HDDInfo = {
  internalHDD: { totalSize: number; freeSize: number; usedSize: number }
  externalHDD?: { totalSize: number; freeSize: number; usedSize: number }
}

export type BoxStatus = {
  name?: string
  status?: number
  product?: string
}

export type TvService = {
  serviceId: string
  name: string
  serviceType?: number
  networkId?: number
  transportStreamId?: number
}

export type TvProgram = {
  eventId: string
  serviceId: string
  title: string
  startDateTime: string   // "YYYYMMDDHHmmss"
  duration: number        // 秒
  description?: string
  genre?: number
  subGenre?: number
  chName?: string
}

// ─── IPC ブリッジ型定義 ──────────────────────────

declare global {
  interface Window {
    electronAPI: {
      nasneRequest: (config: {
        ip: string
        port: number
        path: string
        method?: 'GET' | 'POST'
        body?: string
      }) => Promise<{ success: boolean; data?: unknown; error?: string }>
    }
  }
}

// ─── 内部ユーティリティ ──────────────────────────

async function req<T>(
  ip: string,
  port: number,
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: string
): Promise<T> {
  const result = await window.electronAPI.nasneRequest({ ip, port, path, method, body })
  if (!result.success) {
    throw new Error(result.error ?? 'リクエストが失敗しました')
  }
  return result.data as T
}

function qs(params: Record<string, string>): string {
  const s = new URLSearchParams(params).toString()
  return s ? `?${s}` : ''
}

// ─── ARIB 特殊文字 → テキスト変換 ────────────────────
// ARIB STD-B24 で定義された放送用特殊記号を、対応するテキスト表現に変換する。
//
// 実装メモ:
//   正規表現リテラルの \u{1F21F} は Vite/esbuild のトランスパイルで
//   壊れる場合があるため、String.fromCodePoint() + for...of で
//   コードポイントを直接処理する方式を採用している。
//   for...of はサロゲートペア (U+10000 以上) を正しく 1 文字として扱う。

/** コードポイント → テキスト ラベル の対応表 */
const ARIB_CP_MAP = new Map<number, string>([
  // ── U+1F200 ブロック (Enclosed CJK Letters and Months Supplement) ──
  // ※ nasne/Buffalo は実際には PUA (下記) を使うが、念のため両方定義する
  [0x1F200, '[ほか]'],
  [0x1F201, '[ｺｺ]'],
  [0x1F202, '[サ]'],
  [0x1F203, '[手]'],
  [0x1F204, '[字]'],
  [0x1F205, '[双]'],
  [0x1F206, '[デ]'],
  [0x1F207, '[S]'],
  [0x1F208, '[IC]'],
  [0x1F209, '[中]'],
  [0x1F20A, '[パ]'],
  [0x1F20B, '[紛]'],
  [0x1F20C, '[特]'],
  [0x1F20D, '[セ]'],
  [0x1F20E, '[録]'],
  [0x1F20F, '[宿]'],
  [0x1F210, '[狂]'],
  [0x1F211, '[字]'],
  [0x1F212, '[割]'],
  [0x1F213, '[ア]'],
  [0x1F214, '[お]'],
  [0x1F215, '[合]'],
  [0x1F216, '[無]'],
  [0x1F217, '[有]'],
  [0x1F218, '[問]'],
  [0x1F219, '[優]'],
  [0x1F21A, '[無料]'],
  [0x1F21B, '[料]'],
  [0x1F21C, '[前]'],
  [0x1F21D, '[後]'],
  [0x1F21E, '[再]'],
  [0x1F21F, '[新]'],
  [0x1F220, '[初]'],
  [0x1F221, '[終]'],
  [0x1F222, '[生]'],
  [0x1F223, '[販]'],
  [0x1F224, '[声]'],
  [0x1F225, '[吹]'],
  [0x1F226, '[PPV]'],
  [0x1F227, '[二]'],
  [0x1F228, '[多]'],
  [0x1F229, '[解]'],
  [0x1F22A, '[SS]'],
  [0x1F22B, '[B]'],
  [0x1F22C, '[SE]'],
  [0x1F22D, '[HV]'],
  [0x1F22E, '[5.1]'],
  [0x1F22F, '[指]'],
  [0x1F230, '[今]'],
  [0x1F231, '[MV]'],

  // ── PUA (nasne/Buffalo/Sony が実際に返すコードポイント) ──
  // ユーザー実機で確認済み:
  [0xE180, '[デ]'],   // U+E180 = データ放送 ✓ 実機確認
  [0xE0FE, '[字]'],   // U+E0FE = 字幕 ✓ 実機確認
  [0xE192, '[再]'],   // U+E192 = 再放送 ✓ 実機確認
  [0xE193, '[新]'],   // U+E193 = 新番組 ✓ 実機確認
  [0xE195, '[終]'],   // U+E195 = 最終回 ✓ 実機確認
  // 未確認 (推定; [?E1XX] が現れたら教えてください):
  [0xE194, '[初]'],   // 推定: 初回放送
  [0xE196, '[生]'],   // 推定: 生放送
])

/**
 * ARIB STD-B24 特殊文字を読みやすいテキスト表現に変換する。
 *
 * - ARIB_CP_MAP に登録済み → 対応するテキストラベル ([新], [字], [終] など)
 * - U+E000–U+E1FF (放送マーク推定範囲) で未登録 → "[?EXXXX]" で表示
 *   (DebugView のタイトル調査で確認してから正式に登録する)
 * - U+E200–U+F8FF (一般外字) → 除去
 * - U+F0000–U+10FFFF (補助私用領域) → 除去
 * - その他の文字はそのまま通過
 */
export function cleanAribText(s: string): string {
  if (!s) return s
  let result = ''
  // for...of はサロゲートペアを 1 コードポイントとして正しくイテレートする
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0
    const mapped = ARIB_CP_MAP.get(cp)
    if (mapped !== undefined) {
      // 登録済み ARIB 文字 → テキストラベルに置換
      result += mapped
    } else if (cp >= 0xE000 && cp <= 0xE1FF) {
      // 放送マーク推定範囲の未登録 PUA → "[?EXXXX]" で可視化
      // ※ デバッグ目的: コードポイントを確認したら ARIB_CP_MAP に追加する
      const hex = cp.toString(16).toUpperCase().padStart(4, '0')
      result += `[?${hex}]`
    } else if ((cp >= 0xE200 && cp <= 0xF8FF) || (cp >= 0xF0000 && cp <= 0x10FFFF)) {
      // 一般外字・補助私用領域 → 除去
    } else {
      result += ch
    }
  }
  return result.trim()
}

/**
 * 文字列の各コードポイントを "U+XXXX" 形式の配列で返す (デバッグ用)
 */
export function inspectCodePoints(s: string): string[] {
  const result: string[] = []
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0
    const hex = cp.toString(16).toUpperCase().padStart(4, '0')
    const label = ARIB_CP_MAP.get(cp)
    result.push(label ? `U+${hex}(${label})` : `U+${hex}(${ch})`)
  }
  return result
}

// ─── レスポンスから item 配列を柔軟に取り出す ─────────
// nasne ファームウェアのバージョンや Sony/Buffalo の違いにより
// レスポンスのキー構造が異なる場合があるため、複数パターンに対応する
function extractItems<T>(data: unknown): T[] {
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>

  // パターン1: { item: [...] }  ← 標準
  if (Array.isArray(obj.item)) return obj.item as T[]

  // パターン2: { item: { ... } } ← 単一アイテムがオブジェクトで返る場合
  if (obj.item && typeof obj.item === 'object' && !Array.isArray(obj.item)) {
    return [obj.item as T]
  }

  // パターン3: 何らかのネスト { recorded: { item: [...] }, ... }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      const nested = val as Record<string, unknown>
      if (Array.isArray(nested.item)) return nested.item as T[]
    }
  }

  return []
}

function extractTotal(data: unknown): number {
  if (!data || typeof data !== 'object') return 0
  const obj = data as Record<string, unknown>
  if (typeof obj.totalMatches === 'number') return obj.totalMatches
  if (typeof obj.numberReturned === 'number') return obj.numberReturned
  return 0
}

// ─── 公開 API ─────────────────────────────────────

export const NasneAPI = {
  // ── 録画一覧 ────────────────────────────────────
  async getRecordingList(
    ip: string,
    startIndex = 0,
    count = 0
  ): Promise<{ item: RecordedTitle[]; totalMatches: number }> {
    const path =
      '/recorded/titleListGet' +
      qs({
        searchCriteria: '0',
        filter: '0',
        startingIndex: String(startIndex),
        requestedCount: String(count),
        sortCriteria: '0',
        withDescriptionLong: '0',
        withUserData: '0'
      })
    const raw = await req<unknown>(ip, REMOTE_PORT, path)
    const items = extractItems<RecordedTitle>(raw).map((t) => ({
      ...t,
      title: cleanAribText(t.title)
    }))
    return { item: items, totalMatches: extractTotal(raw) }
  },

  // ── 録画削除 ────────────────────────────────────
  async deleteRecording(ip: string, id: string): Promise<unknown> {
    const body = new URLSearchParams({ id }).toString()
    return req(ip, REMOTE_PORT, '/recorded/titleDelete', 'POST', body)
  },

  // ── 予約一覧 ────────────────────────────────────
  async getReservationList(
    ip: string
  ): Promise<{ item: Reservation[]; totalMatches: number }> {
    const path =
      '/schedule/reservedListGet' +
      qs({
        searchCriteria: '0',
        filter: '0',
        startingIndex: '0',
        requestedCount: '0',
        sortCriteria: '0'
      })
    const raw = await req<unknown>(ip, REMOTE_PORT, path)
    const items = extractItems<Reservation>(raw).map((r) => ({
      ...r,
      title: cleanAribText(r.title)
    }))
    return { item: items, totalMatches: extractTotal(raw) }
  },

  // ── 予約作成 ────────────────────────────────────
  async createReservation(
    ip: string,
    params: {
      title: string
      startDateTime: string   // "YYYYMMDDHHmmss"
      duration: number        // 秒
      serviceId: string
      broadcastingType?: number // 1=地デジ, 2=BS, 3=CS
      eventId?: string
      quality?: number          // 100=DR, 101=3倍, 102=5倍
      storageId?: number        // 0=内蔵, 1=外付け
    }
  ): Promise<unknown> {
    const body = new URLSearchParams({
      title:            params.title,
      startDateTime:    params.startDateTime,
      duration:         String(params.duration),
      broadcastingType: String(params.broadcastingType ?? 1),
      serviceId:        params.serviceId,
      eventId:          params.eventId ?? '0',
      conditionId:      '1',
      quality:          String(params.quality ?? 100),
      priorityFlag:     '0',
      storageId:        String(params.storageId ?? 0),
      creatorId:        '0',
      forceFlag:        '0'
    }).toString()
    return req(ip, REMOTE_PORT, '/schedule/reservedInfoCreate', 'POST', body)
  },

  // ── 予約削除 ────────────────────────────────────
  async deleteReservation(ip: string, id: string): Promise<unknown> {
    const body = new URLSearchParams({ id, recInfoDeleteFlag: '0' }).toString()
    return req(ip, REMOTE_PORT, '/schedule/reservedInfoDelete', 'POST', body)
  },

  // ── HDD 情報 ────────────────────────────────────
  async getHDDInfo(ip: string): Promise<{ HDD: HDDInfo }> {
    return req(ip, STATUS_PORT, '/status/HDDInfoGet')
  },

  // ── ボックス状態 ────────────────────────────────
  async getBoxStatus(ip: string): Promise<{ box: BoxStatus[] }> {
    return req(ip, STATUS_PORT, '/status/boxStatusListGet')
  },

  // ── ボックス名 ──────────────────────────────────
  async getBoxName(ip: string): Promise<{ name: string }> {
    return req(ip, STATUS_PORT, '/status/boxNameGet')
  },

  // ── チャンネル(サービス)一覧 ─────────────────────
  async getServiceList(ip: string): Promise<TvService[]> {
    const path =
      '/schedule/serviceListGet' +
      qs({ searchCriteria: '0', sortCriteria: '0' })
    const raw = await req<unknown>(ip, REMOTE_PORT, path)
    return extractItems<TvService>(raw)
  },

  // ── 番組表取得 (キーワード・チャンネル・日時で絞り込み) ──
  async searchTvPrograms(
    ip: string,
    params: {
      keyword?: string
      serviceId?: string
      startDateTime?: string  // "YYYYMMDDHHmmss"
      count?: number
    }
  ): Promise<{ item: TvProgram[]; totalMatches: number }> {
    const qParams: Record<string, string> = {
      searchCriteria: '0',
      filter: '0',
      startingIndex: '0',
      requestedCount: String(params.count ?? 200),
      sortCriteria: '0'
    }
    if (params.keyword)       qParams.titleKeyword   = params.keyword
    if (params.serviceId)     qParams.serviceId      = params.serviceId
    if (params.startDateTime) qParams.startDateTime  = params.startDateTime

    const path = '/schedule/tvProgramListGet' + qs(qParams)
    const raw = await req<unknown>(ip, REMOTE_PORT, path)
    return {
      item: extractItems<TvProgram>(raw),
      totalMatches: extractTotal(raw)
    }
  }
}

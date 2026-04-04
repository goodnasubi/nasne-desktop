// ─────────────────────────────────────────────
// NHK 番組表 API v3 クライアント
//
// APIキー取得: https://api-portal.nhk.or.jp
// ─────────────────────────────────────────────

declare global {
  interface Window {
    electronAPI: {
      nasneRequest: (config: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>
      openExternal: (url: string) => Promise<void>
      externalGet: (url: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
    }
  }
}

// ─── 型定義 ───────────────────────────────────

export type NhkProgram = {
  id: string
  event_id: string | number
  start_time: string   // ISO8601: "2026-04-03T08:00:00+09:00"
  end_time: string
  title: string
  subtitle?: string
  content?: string
  act?: string
  genres?: string[]
}

export type NhkService = {
  code: string          // "g1", "e1", "s1", "s4"
  name: string          // "NHK 総合", etc.
  broadcastingType: number  // 1=地デジ, 2=BS
  serviceId?: string    // nasne の serviceId (オプション)
}

// ─── チャンネル定義 ───────────────────────────

export const NHK_SERVICES: NhkService[] = [
  { code: 'g1', name: 'NHK 総合',  broadcastingType: 1 },
  { code: 'e1', name: 'NHK Eテレ', broadcastingType: 1 },
  { code: 's1', name: 'NHK BS1',   broadcastingType: 2 },
  { code: 's4', name: 'NHK BS4K',  broadcastingType: 2 },
]

// ─── エリアコード一覧 ─────────────────────────

export const NHK_AREAS: { code: string; name: string }[] = [
  { code: '010', name: '北海道' },
  { code: '020', name: '岩手' },
  { code: '030', name: '宮城' },
  { code: '040', name: '秋田' },
  { code: '050', name: '山形' },
  { code: '060', name: '福島' },
  { code: '070', name: '水戸' },
  { code: '080', name: '宇都宮' },
  { code: '090', name: '前橋' },
  { code: '100', name: 'さいたま' },
  { code: '110', name: '千葉' },
  { code: '120', name: '東京' },
  { code: '130', name: '横浜' },
  { code: '140', name: '新潟' },
  { code: '150', name: '富山' },
  { code: '160', name: '金沢' },
  { code: '170', name: '福井' },
  { code: '180', name: '甲府' },
  { code: '190', name: '長野' },
  { code: '200', name: '静岡' },
  { code: '210', name: '名古屋' },
  { code: '220', name: '津' },
  { code: '230', name: '大津' },
  { code: '240', name: '京都' },
  { code: '250', name: '大阪' },
  { code: '260', name: '神戸' },
  { code: '270', name: '奈良' },
  { code: '280', name: '和歌山' },
  { code: '290', name: '鳥取' },
  { code: '300', name: '松江' },
  { code: '310', name: '岡山' },
  { code: '320', name: '広島' },
  { code: '330', name: '山口' },
  { code: '340', name: '徳島' },
  { code: '350', name: '高松' },
  { code: '360', name: '松山' },
  { code: '370', name: '高知' },
  { code: '380', name: '福岡' },
  { code: '390', name: '佐賀' },
  { code: '400', name: '長崎' },
  { code: '410', name: '熊本' },
  { code: '420', name: '大分' },
  { code: '430', name: '宮崎' },
  { code: '440', name: '鹿児島' },
  { code: '450', name: '那覇' },
]

// ─── API ─────────────────────────────────────

/**
 * 指定サービス・エリア・日付の番組リストを取得
 * NHK API v3: https://program-api.nhk.jp/v3/papiPgList
 * NHK API v2 fallback: https://api.nhk.or.jp/v2/pg/list/{area}/{service}/{date}.json
 */
export async function fetchNhkPrograms(
  apiKey: string,
  area: string,
  service: string,
  date: string  // "YYYY-MM-DD"
): Promise<NhkProgram[]> {
  // v3 エンドポイントを先に試す
  const v3url = `https://program-api.nhk.jp/v3/papiPgList?service=${service}&area=${area}&date=${date}&apikey=${apiKey}`
  const result = await window.electronAPI.externalGet(v3url)

  if (result.success && result.data) {
    return extractPrograms(result.data, service)
  }

  // v3 が失敗したら v2 にフォールバック
  const v2url = `https://api.nhk.or.jp/v2/pg/list/${area}/${service}/${date}.json?key=${apiKey}`
  const result2 = await window.electronAPI.externalGet(v2url)

  if (result2.success && result2.data) {
    return extractPrograms(result2.data, service)
  }

  const errMsg = result.error ?? result2.error ?? '番組データを取得できませんでした'
  throw new Error(errMsg)
}

/** レスポンス JSON から番組配列を取り出す (v2/v3 両対応) */
function extractPrograms(data: unknown, service: string): NhkProgram[] {
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>

  // v3 / v2 共通: { list: { g1: [...] } }
  if (obj.list && typeof obj.list === 'object') {
    const list = obj.list as Record<string, unknown>
    if (Array.isArray(list[service])) return list[service] as NhkProgram[]
    // キーを無視して最初の配列を返す
    for (const val of Object.values(list)) {
      if (Array.isArray(val)) return val as NhkProgram[]
    }
  }

  // トップレベルに直接配列
  if (Array.isArray(obj[service])) return obj[service] as NhkProgram[]

  return []
}

// ─── ユーティリティ ───────────────────────────

/** ISO8601 → Date */
export function parseNhkTime(iso: string): Date {
  return new Date(iso)
}

/** 分単位の差分 */
export function durationMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

// ─────────────────────────────────────────────
// nasne HTTP API クライアント
//
// 使用ポート:
//   64210  … ステータス系 (HDD 情報、ボックス状態など)
//   64220  … 録画・予約系 (タイトル一覧、予約管理など)
// ─────────────────────────────────────────────

export const STATUS_PORT = 64210
export const REMOTE_PORT = 64220

// ─── ジャンルマッピング ───────────────────────────

// ─── サービスID ↔ チャンネル名 フォールバック対応表 ──────────
// nasne API から取得できない場合や、応答が不完全な場合の為のフォールバック
// 参考: http://soranikakaruhashi.blog.fc2.com/blog-entry-71.html
// ─── サービスID ↔ チャンネル名 フォールバック対応表 ──────────
// nasne API から取得できない場合や、応答が不完全な場合の為のフォールバック
// 参考: http://soranikakaruhashi.blog.fc2.com/blog-entry-71.html
const DEFAULT_SERVICE_NAMES: Record<string, string> = {
  // ── BS デジタル放送 ──────────────────────────
  '101': 'NHK BS1', '103': 'NHK BSプレミアム',
  '141': 'BS日テレ', '151': 'BS朝日',
  '161': 'BS-TBS', '171': 'BSジャパン', '181': 'BSフジ',
  '191': 'WOWOWプライム', '192': 'WOWOWライブ', '193': 'WOWOWシネマ',
  '200': 'スター・チャンネル1', '201': 'スター・チャンネル2', '202': 'スター・チャンネル3',
  '211': 'BS11', '222': 'TwelveV',
  '231': '放送大学', '232': '放送大学', '233': '放送大学',
  '234': 'グリーンチャンネル', '236': 'BSアニマックス',
  '238': 'FOX bs238', '241': 'BSスカパー！',
  '242': 'J SPORTS1', '243': 'J SPORTS2', '244': 'J SPORTS3', '245': 'J SPORTS4',
  '251': 'BS釣りビジョン', '252': 'IMAGICA BS',
  '255': '日本映画専門チャンネル', '256': 'ディズニー・チャンネル',
  '258': 'Dlife',
  
  // ── 関東 ────────────────────────
  '1024': 'NHK総合・東京', '1032': 'NHKEテレ東京', '1040': '日本テレビ',
  '1048': 'TBS', '1056': 'フジテレビジョン', '1064': 'テレビ朝日',
  '1072': 'テレビ東京', '1088': '放送大学',
  // ── 近畿 ────────────────────────
  '2056': 'NHKEテレ大阪', '2064': 'MBS毎日放送', '2072': 'ABCテレビ',
  '2080': '関西テレビ', '2088': '読売テレビ',
  // ── 中京 ────────────────────────
  '3080': 'NHKEテレ名古屋', '3088': '東海テレビ', '3096': 'CBC',
  '3104': 'メ～テレ', '3112': '中京テレビ',
  // ── 北海道（広域）────────────────
  '4112': 'HBC北海道放送', '4120': 'STV札幌テレビ', '4128': 'HTB北海道テレビ',
  '4136': 'UHB', '4144': 'TVH',
  // ── 岡山香川 ────────────────────
  '5136': 'RNC西日本テレビ', '5144': 'KSB瀬戸内海放送', '5152': 'RSKテレビ',
  '5160': 'TSCテレビせとうち', '5168': 'OHKテレビ',
  // ── 島根鳥取 ────────────────────
  '6160': '山陰中央テレビ', '6168': 'BSSテレビ', '6176': '日本海テレビ',
  // ── 北海道（札幌）───────────────
  '10240': 'NHK総合・札幌', '10248': 'NHKEテレ札幌', '10256': 'HBC札幌',
  '10264': 'STV札幌', '10272': 'HTB札幌', '10280': 'UHB札幌', '10288': 'TVH札幌',
  // ── 北海道（函館）───────────────
  '11264': 'NHK総合・函館', '11272': 'NHKEテレ函館', '11280': 'HBC函館',
  '11288': 'STV函館', '11296': 'HTB函館', '11304': 'UHB函館', '11312': 'TVH函館',
  // ── 北海道（旭川）───────────────
  '12288': 'NHK総合・旭川', '12296': 'NHKEテレ旭川', '12304': 'HBC旭川',
  '12312': 'STV旭川', '12320': 'HTB旭川', '12328': 'UHB旭川', '12336': 'TVH旭川',
  // ── 北海道（帯広）───────────────
  '13312': 'NHK総合・帯広', '13320': 'NHKEテレ帯広', '13328': 'HBC帯広',
  '13336': 'STV帯広', '13344': 'HTB帯広', '13352': 'UHB帯広', '13360': 'TVH帯広',
  // ── 北海道（釧路）───────────────
  '14336': 'NHK総合・釧路', '14344': 'NHKEテレ釧路', '14352': 'HBC釧路',
  '14360': 'STV釧路', '14368': 'HTB釧路', '14376': 'UHB釧路', '14384': 'TVH釧路',
  // ── 北海道（北見）───────────────
  '15360': 'NHK総合・北見', '15368': 'NHKEテレ北見', '15376': 'HBC北見',
  '15384': 'STV北見', '15392': 'HTB北見', '15400': 'UHB北見', '15408': 'TVH北見',
  // ── 北海道（室蘭）───────────────
  '16384': 'NHK総合・室蘭', '16392': 'NHKEテレ室蘭', '16400': 'HBC室蘭',
  '16408': 'STV室蘭', '16416': 'HTB室蘭', '16424': 'UHB室蘭', '16432': 'TVH室蘭',
  // ── 宮城 ────────────────────────
  '17408': 'NHK総合・仙台', '17416': 'NHKEテレ仙台', '17424': 'TBCテレビ',
  '17432': '仙台放送', '17440': 'ミヤギテレビ', '17448': 'KHB東日本放送',
  // ── 秋田 ────────────────────────
  '18432': 'NHK総合・秋田', '18440': 'NHKEテレ秋田', '18448': 'ABS秋田放送',
  '18456': 'AKT秋田テレビ', '18464': 'AAB秋田朝日放送',
  // ── 山形 ────────────────────────
  '19456': 'NHK総合・山形', '19464': 'NHKEテレ山形', '19472': 'YBC山形放送',
  '19480': 'YTS山形テレビ', '19488': 'テレビユー山形', '19496': 'さくらんぼテレビ',
  // ── 岩手 ────────────────────────
  '20480': 'NHK総合・盛岡', '20488': 'NHKEテレ盛岡', '20496': 'IBCテレビ',
  '20504': 'テレビ岩手', '20512': 'めんこいテレビ', '20520': '岩手朝日テレビ',
  // ── 福島 ────────────────────────
  '21504': 'NHK総合・福島', '21512': 'NHKEテレ福島', '21520': '福島テレビ',
  '21528': '福島中央テレビ', '21536': 'KFB福島放送', '21544': 'テレビユー福島',
  // ── 青森 ────────────────────────
  '22528': 'NHK総合・青森', '22536': 'NHKEテレ青森', '22544': 'RAB青森放送',
  '22552': 'ATV青森テレビ', '22560': '青森朝日放送',
  // ── その他地域（東京・神奈川・栃木など） ────
  '23608': 'TOKYO MX', '24632': 'tvk', '25600': 'NHK総合・前橋',
  '25656': '群馬テレビ', '26624': 'NHK総合・水戸', '27704': 'チバテレビ',
  '28672': 'NHK総合・宇都宮', '28728': 'とちぎテレビ', '29752': 'テレ玉',
  // ── 長野 ────────────────────────
  '30720': 'NHK総合・長野', '30728': 'NHKEテレ長野', '30736': 'テレビ信州',
  '30744': 'abn長野朝日放送', '30752': 'SBC信越放送', '30760': 'NBS長野放送',
  // ── 新潟 ────────────────────────
  '31744': 'NHK総合・新潟', '31752': 'NHKEテレ新潟', '31760': 'BSN',
  '31768': 'NST', '31776': 'TeNYテレビ新潟', '31784': '新潟テレビ21',
  // ── 山梨 ────────────────────────
  '32768': 'NHK総合・甲府', '32776': 'NHKEテレ甲府', '32784': 'YBS山梨放送',
  '32792': 'UTY',
  // ── 愛知 ────────────────────────
  '33792': 'NHK総合・名古屋', '33840': 'テレビ愛知',
  // ── 石川 ────────────────────────
  '34816': 'NHK総合・金沢', '34824': 'NHKEテレ金沢', '34832': 'テレビ金沢',
  '34840': '北陸朝日放送', '34848': 'MRO', '34856': '石川テレビ',
  // ── 静岡 ────────────────────────
  '35840': 'NHK総合・静岡', '35848': 'NHKEテレ静岡', '35856': 'SBS',
  '35864': 'テレビ静岡', '35872': 'だいいちテレビ', '35880': '静岡朝日テレビ',
  // ── 福井 ────────────────────────
  '36864': 'NHK総合・福井', '36872': 'NHKEテレ福井', '36880': 'FBCテレビ',
  '36888': '福井テレビ',
  // ── 富山 ────────────────────────
  '37888': 'NHK総合・富山', '37896': 'NHKEテレ富山', '37904': 'KNB北日本放送',
  '37912': 'BBT富山テレビ', '37920': 'チューリップテレビ',
  // ── 三重 ────────────────────────
  '38912': 'NHK総合・津', '38960': '三重テレビ',
  // ── 岐阜 ────────────────────────
  '39936': 'NHK総合・岐阜', '39984': 'ぎふチャン',
  // ── 大阪 ────────────────────────
  '40960': 'NHK総合・大阪', '41008': 'テレビ大阪',
  // ── 京都 ────────────────────────
  '41984': 'NHK総合・京都', '42032': 'KBS京都',
  // ── 兵庫 ────────────────────────
  '43008': 'NHK総合・神戸', '43056': 'サンテレビ',
  // ── 和歌山 ──────────────────────
  '44032': 'NHK総合・和歌山', '44080': 'テレビ和歌山',
  // ── 奈良 ────────────────────────
  '45056': 'NHK総合・奈良', '45104': '奈良テレビ',
  // ── 滋賀 ────────────────────────
  '46080': 'NHK総合・大津', '46128': 'BBCびわ湖放送',
  // ── 広島 ────────────────────────
  '47104': 'NHK総合・広島', '47112': 'NHKEテレ広島', '47120': 'RCCテレビ',
  '47128': '広島テレビ', '47136': '広島ホームテレビ', '47144': 'TSS',
  // ── 岡山 ────────────────────────
  '48128': 'NHK総合・岡山', '48136': 'NHKEテレ岡山',
  // ── 島根 ────────────────────────
  '49152': 'NHK総合・松江', '49160': 'NHKEテレ松江',
  // ── 鳥取 ────────────────────────
  '50176': 'NHK総合・鳥取', '50184': 'NHKEテレ鳥取',
  // ── 山口 ────────────────────────
  '51200': 'NHK総合・山口', '51208': 'NHKEテレ山口', '51216': 'KRY山口放送',
  '51224': 'tysテレビ山口', '51232': 'yab山口朝日',
  // ── 愛媛 ────────────────────────
  '52224': 'NHK総合・松山', '52232': 'NHKEテレ松山', '52240': '南海放送',
  '52248': '愛媛朝日', '52256': 'あいテレビ', '52264': 'テレビ愛媛',
  // ── 香川 ────────────────────────
  '53248': 'NHK総合・高松', '53256': 'NHKEテレ高松',
  // ── 徳島 ────────────────────────
  '54272': 'NHK総合・徳島', '54280': 'NHKEテレ徳島', '54288': '四国放送',
  // ── 高知 ────────────────────────
  '55296': 'NHK総合・高知', '55304': 'NHKEテレ高知', '55312': '高知放送',
  '55320': 'テレビ高知', '55328': 'さんさんテレビ',
  // ── 福岡 ────────────────────────
  '56320': 'NHK総合・福岡', '56832': 'NHK総合・北九州', '56328': 'NHKEテレ福岡',
  '56840': 'NHKEテレ北九州', '56336': 'KBC九州朝日放送', '56344': 'RKB毎日放送',
  '56352': 'FBS福岡放送', '56360': 'TVQ九州放送', '56368': 'TNOテレビ西日本',
  // ── 熊本 ────────────────────────
  '57344': 'NHK総合・熊本', '57352': 'NHKEテレ熊本', '57360': 'RKK熊本放送',
  '57368': 'TKUテレビ熊本', '57376': 'KKTくまもと県民', '57384': 'KAB熊本朝日放送',
  // ── 長崎 ────────────────────────
  '58368': 'NHK総合・長崎', '58376': 'NHKEテレ長崎', '58384': 'NBC長崎放送',
  '58392': 'KTNテレビ長崎', '58400': 'NCC長崎文化放送', '58408': 'NIB長崎国際テレビ',
  // ── 鹿児島 ──────────────────────
  '59392': 'NHK総合・鹿児島', '59400': 'NHKEテレ鹿児島', '59408': 'MBC南日本放送',
  '59416': 'KTS鹿児島テレビ', '59424': 'KKB鹿児島放送', '59432': 'KYT鹿児島読売TV',
  // ── 宮崎 ────────────────────────
  '60416': 'NHK総合・宮崎', '60424': 'NHKEテレ宮崎', '60432': 'MRT宮崎放送',
  '60440': 'UMKテレビ宮崎',
  // ── 大分 ────────────────────────
  '61440': 'NHK総合・大分', '61448': 'NHKEテレ大分', '61456': 'OBS大分放送',
  '61464': 'TOSテレビ大分', '61472': 'OAB大分朝日放送',
  // ── 佐賀 ────────────────────────
  '62464': 'NHK総合・佐賀', '62472': 'NHKEテレ佐賀', '62480': 'STSサガテレビ',
  // ── 沖縄 ────────────────────────
  '63488': 'NHK総合・沖縄', '63496': 'NHKEテレ沖縄', '63504': 'RBCテレビ',
  '63520': 'QAB琉球朝日放送', '63544': '沖縄テレビ(OTV)',
}

const GENRE_MAP: Record<number, string> = {
  0: 'ニュース/報道',
  1: 'スポーツ',
  2: '情報/ワイドショー',
  3: 'ドラマ',
  4: '音楽',
  5: 'バラエティ',
  6: '映画',
  7: 'アニメ/特撮',
  8: 'ドキュメンタリー/教養',
  9: '劇場/公演',
  10: '趣味/教育',
  11: '福祉',
  12: '予備',
  13: '予備',
  14: '拡張',
  15: 'その他'
}

function mapGenre(genre?: number): string | undefined {
  if (genre === undefined) return undefined
  return GENRE_MAP[genre] || 'その他'
}

export type RecordedTitle = {
  id: string
  title: string
  startDateTime: string   // "YYYYMMDDHHmmss" 形式
  duration: number        // 秒
  serviceId?: string      // チャンネル ID
  chName?: string         // チャンネル名
  contentUrl?: string     // 再生 URL (DLNA)
  genre?: string          // ジャンル名（マッピング済み）
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
  name?: string
  serviceName?: string
  channelName?: string
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
        withDescriptionLong: '1',  // 詳細な説明を取得
        withUserData: '0'
      })
    const raw = await req<unknown>(ip, REMOTE_PORT, path)
    const items = extractItems<RecordedTitle>(raw).map((t) => ({
      ...t,
      title: cleanAribText(t.title),
      description: t.description ? cleanAribText(t.description) : t.description,
      genre: mapGenre(t.genre as number | undefined)
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
    const endpoints = [
      { port: REMOTE_PORT, path: '/schedule/serviceListGet' + qs({ searchCriteria: '0', sortCriteria: '0' }) },
      { port: REMOTE_PORT, path: '/recorded/serviceListGet' + qs({ searchCriteria: '0', sortCriteria: '0' }) },
      { port: STATUS_PORT, path: '/status/serviceListGet' }
    ]

    const servicesById: Record<string, TvService> = {}

    const normalizeId = (id: unknown): string => {
      if (id === undefined || id === null) return ''
      return String(id).trim()
    }

    const normalizeName = (service: TvService): string | undefined => {
      return (
        service.name?.trim() ||
        service.serviceName?.trim() ||
        service.channelName?.trim()
      )
    }

    for (const endpoint of endpoints) {
      try {
        const raw = await req<unknown>(ip, endpoint.port, endpoint.path)
        const items = extractItems<TvService>(raw)
        items.forEach((service) => {
          const serviceId = normalizeId(service.serviceId)
          if (!serviceId) return

          const existing = servicesById[serviceId]
          const next: TvService = {
            ...existing,
            ...service,
            serviceId,
          }

          const name = normalizeName(next)
          if (name) {
            next.name = name
          }

          servicesById[serviceId] = next
        })
      } catch {
        // フォールバックとして次のエンドポイントを試す
      }
    }

    // デフォルト対応表でフォールバック: 名前がない場合に使用
    Object.entries(servicesById).forEach(([serviceId, service]) => {
      if (!normalizeName(service)) {
        const fallbackName = DEFAULT_SERVICE_NAMES[serviceId]
        if (fallbackName) {
          service.name = fallbackName
        }
      }
    })

    // API が返さなかったサービスも DEFAULT_SERVICE_NAMES から補充
    Object.entries(DEFAULT_SERVICE_NAMES).forEach(([serviceId, name]) => {
      if (!servicesById[serviceId]) {
        servicesById[serviceId] = {
          serviceId,
          name
        }
      }
    })

    return Object.values(servicesById)
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

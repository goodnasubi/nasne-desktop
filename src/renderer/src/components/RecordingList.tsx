import { useState, useEffect, useCallback } from 'react'
import { NasneAPI, type RecordedTitle } from '../api/nasne'

// nasne の日時フォーマット "YYYYMMDDHHmmss" → "YYYY/MM/DD HH:mm"
function formatDateTime(dt: string): string {
  if (!dt) return '—'
  try {
    if (/^\d{14}$/.test(dt)) {
      return `${dt.slice(0, 4)}/${dt.slice(4, 6)}/${dt.slice(6, 8)} ${dt.slice(8, 10)}:${dt.slice(10, 12)}`
    }
    return new Date(dt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dt
  }
}

function formatDuration(sec: number): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

// グルーピングタイプ
type GroupByType = 'none' | 'title' | 'channel' | 'genre' | 'date'

// グルーピングオプション
const GROUP_OPTIONS: { value: GroupByType; label: string; icon: string }[] = [
  { value: 'none', label: 'なし', icon: '📋' },
  { value: 'title', label: '番組名', icon: '📺' },
  { value: 'channel', label: 'チャンネル', icon: '📻' },
  { value: 'genre', label: 'ジャンル', icon: '🏷️' },
  { value: 'date', label: '日付', icon: '📅' }
]

// 番組タイトルからシリーズ名を正規化
function normalizeTitle(title: string): string {
  let normalized = title.trim()

  // 先頭の [新] などの放送タグを削除
  normalized = normalized.replace(/^[\s\u3000]*(?:\[新\]|\[終\]|\[字\]|\[再\]|\[デ\]|\[解\]|\[SS\]|\[PR\]|\[他\]|【新】|【終】|【字】|【再】|【デ】|【解】|【SS】|【PR】|【他】)\s*/u, '').trim()

  // 先頭の番組名を括弧から抽出
  const bracketMatch = normalized.match(/^[\s\u3000]*[『【\[]([^』】\]]+)[』】\]]/u)
  if (bracketMatch) {
    normalized = bracketMatch[1].trim()
    if (normalized) return normalized
  }

  normalized = normalized
    .replace(/[\s\u3000]*★.*$/u, '')
    .replace(/[\s\u3000]*＃.*$/u, '')
    .replace(/[\s\u3000]*#.*$/u, '')
    .replace(/[\s\u3000]*第\s*\d+話.*$/u, '')
    .replace(/[\s\u3000]*\d+話.*$/u, '')
    .replace(/[\s\u3000]*\(\s*\d+\s*\)[\s\u3000]*$/u, '')
    .replace(/[\s\u3000]*\d+\/\d+[\s\u3000]*$/u, '')
    .replace(/[\s\u3000]*\[.*?\]$/u, '')
    .trim()

  return normalized || title
}

// 日付からグループキーを生成
function getDateGroupKey(dateStr: string): string {
  if (!dateStr || !/^\d{14}$/.test(dateStr)) return '不明'

  const year = dateStr.slice(0, 4)
  const month = dateStr.slice(4, 6)
  const day = dateStr.slice(6, 8)

  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '昨日'
  if (diffDays <= 7) return '今週'
  if (diffDays <= 30) return `${month}月`
  return `${year}年${month}月`
}

type Props = { nasneIp: string }

export default function RecordingList({ nasneIp }: Props) {
  const [recordings, setRecordings] = useState<RecordedTitle[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState<GroupByType>('none')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await NasneAPI.getRecordingList(nasneIp)
      setRecordings(data?.item ?? [])
      setTotal(data?.totalMatches ?? 0)
    } catch (err) {
      setError(`録画一覧を取得できませんでした。\n${err}`)
    } finally {
      setLoading(false)
    }
  }, [nasneIp])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async (rec: RecordedTitle) => {
    if (!confirm(`「${rec.title}」を削除しますか？\nこの操作は取り消せません。`)) return
    setDeletingId(rec.id)
    try {
      await NasneAPI.deleteRecording(nasneIp, rec.id)
      setRecordings((prev) => prev.filter((r) => r.id !== rec.id))
    } catch (err) {
      alert(`削除に失敗しました。\n${err}`)
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = recordings.filter(
    (r) =>
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.chName ?? '').includes(search)
  )

  // グルーピング処理
  const grouped = groupBy !== 'none' ? filtered.reduce((acc, rec) => {
    let key: string

    switch (groupBy) {
      case 'title':
        key = normalizeTitle(rec.title)
        break
      case 'channel':
        key = rec.chName || 'チャンネル不明'
        break
      case 'genre':
        key = rec.genre || 'ジャンル不明'
        break
      case 'date':
        key = getDateGroupKey(rec.startDateTime)
        break
      default:
        key = 'その他'
    }

    if (!acc[key]) acc[key] = []
    acc[key].push(rec)
    return acc
  }, {} as Record<string, RecordedTitle[]>) : null

  const getLatestDate = (recs: RecordedTitle[]): string =>
    recs.reduce((latest, rec) => (rec.startDateTime > latest ? rec.startDateTime : latest), '00000000000000')

  // グループをソート（最新録画日時の降順）
  const sortedGroups = grouped ? Object.entries(grouped).sort(([, recsA], [, recsB]) => {
    const latestA = getLatestDate(recsA)
    const latestB = getLatestDate(recsB)
    if (latestA !== latestB) return latestB.localeCompare(latestA)
    return recsA[0].title.localeCompare(recsB[0].title)
  }) : null

  // グループ表示時は初期状態で全て開く
  useEffect(() => {
    if (groupBy === 'none' || !grouped) {
      setExpandedGroups(new Set())
      return
    }
    setExpandedGroups(new Set(Object.keys(grouped)))
  }, [groupBy, grouped])

  // ── ローディング ────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h2 className="page-title">録画一覧</h2>
        </div>
        <div className="loading-state">
          <div className="spinner" />
          <span>nasne に接続中...</span>
        </div>
      </div>
    )
  }

  // ── エラー ──────────────────────────────────────
  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h2 className="page-title">録画一覧</h2>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
          <button className="btn-secondary" onClick={fetch}>
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* ヘッダー */}
      <div className="page-header">
        <h2 className="page-title">録画一覧</h2>
        <div className="header-actions">
          <span className="badge">{total} 件</span>

          {/* グルーピング選択 */}
          <div className="group-selector">
            <span className="group-label">グループ:</span>
            <select
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value as GroupByType)
                setExpandedGroups(new Set()) // グルーピング変更時に展開状態をリセット
              }}
              className="group-select"
            >
              {GROUP_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          <button className="btn-icon" onClick={fetch} title="更新">
            ↻
          </button>
        </div>
      </div>

      {/* 検索バー */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="番組名やチャンネルで検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch('')}>
            ✕
          </button>
        )}
      </div>

      {/* リスト */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>{search ? '検索結果がありません' : '録画データがありません'}</p>
        </div>
      ) : groupBy !== 'none' ? (
        <div className="grouped-list">
          {sortedGroups!.map(([groupKey, recs]) => (
            <div key={groupKey} className="group-section">
              <div className="group-header" onClick={() => {
                const newExpanded = new Set(expandedGroups)
                if (newExpanded.has(groupKey)) {
                  newExpanded.delete(groupKey)
                } else {
                  newExpanded.add(groupKey)
                }
                setExpandedGroups(newExpanded)
              }}>
                <h3 className="group-title">{groupKey}</h3>
                <span className="group-count">({recs.length}件)</span>
                <span className="group-toggle">{expandedGroups.has(groupKey) ? '▼' : '▶'}</span>
              </div>
              {expandedGroups.has(groupKey) && (
                <div className="group-items">
                  {recs.map((rec) => (
                    <div key={rec.id} className="recording-item">
                      <div className="recording-info">
                        <div className="recording-title">{rec.title}</div>
                        <div className="recording-meta">
                          <span className="meta-chip">{formatDateTime(rec.startDateTime)}</span>
                          <span className="meta-chip">{formatDuration(rec.duration)}</span>
                          {rec.chName && groupBy !== 'channel' && <span className="meta-chip">{rec.chName}</span>}
                          {rec.genre && groupBy !== 'genre' && <span className="meta-chip">{rec.genre}</span>}
                        </div>
                      </div>
                      <div className="recording-actions">
                        <button
                          className="btn-danger-sm"
                          onClick={() => handleDelete(rec)}
                          disabled={deletingId === rec.id}
                        >
                          {deletingId === rec.id ? '削除中…' : '削除'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="item-list">
          {filtered.map((rec) => (
            <div key={rec.id} className="recording-item">
              <div className="recording-info">
                <div className="recording-title">{rec.title}</div>
                <div className="recording-meta">
                  <span className="meta-chip">{formatDateTime(rec.startDateTime)}</span>
                  <span className="meta-chip">{formatDuration(rec.duration)}</span>
                  {rec.chName && <span className="meta-chip">{rec.chName}</span>}
                  {rec.genre && <span className="meta-chip">{rec.genre}</span>}
                </div>
              </div>
              <div className="recording-actions">
                <button
                  className="btn-danger-sm"
                  onClick={() => handleDelete(rec)}
                  disabled={deletingId === rec.id}
                >
                  {deletingId === rec.id ? '削除中…' : '削除'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

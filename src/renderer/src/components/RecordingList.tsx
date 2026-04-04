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

// チャンネルグループのキーを生成
function getChannelGroupKey(rec: RecordedTitle): string {
  if (rec.chName) return rec.chName
  if (rec.serviceId) return `serviceId:${rec.serviceId}`
  return 'チャンネル不明'
}

// 日付からグループキーを生成
function getDateGroupKey(dateStr: string): string {
  if (!dateStr) return '不明'

  let year: string, month: string, day: string
  if (/^\d{14}$/.test(dateStr)) {
    // YYYYMMDDHHmmss 形式
    year  = dateStr.slice(0, 4)
    month = dateStr.slice(4, 6)
    day   = dateStr.slice(6, 8)
  } else {
    // ISO 8601 形式 ("2026-04-04T17:29:47+09:00" など)
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '不明'
    year  = String(d.getFullYear())
    month = String(d.getMonth() + 1).padStart(2, '0')
    day   = String(d.getDate()).padStart(2, '0')
  }

  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '昨日'
  if (diffDays <= 7) return '今週'
  if (diffDays <= 30) return `${month}月`
  return `${year}年${month}月`
}

function normalizeServiceId(serviceId: unknown): string {
  if (serviceId === undefined || serviceId === null) return ''
  return String(serviceId).trim()
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
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({})
  const [groupToggleState, setGroupToggleState] = useState<'expand' | 'collapse'>('expand')

  // グループの展開/縮小をトグル
  const handleToggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }, [])

  // グループ展開/縮小のトグル切り替え
  const handleGroupToggle = () => {
    const newState = groupToggleState === 'expand' ? 'collapse' : 'expand'
    setGroupToggleState(newState)
    if (newState === 'expand' && sortedGroups && sortedGroups.length > 0) {
      setExpandedGroups(new Set(sortedGroups.map(([key]) => key)))
    } else if (newState === 'collapse') {
      setExpandedGroups(new Set())
    }
  }

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await NasneAPI.getRecordingList(nasneIp)
      const recordings = data?.item ?? []
      setRecordings(recordings)
      setTotal(data?.totalMatches ?? 0)

      const newServiceNames: Record<string, string> = {}
      recordings.forEach((rec) => {
        const id = normalizeServiceId(rec.serviceId)
        if (!id) return
        if (rec.chName) {
          newServiceNames[id] = rec.chName
        }
      })
      if (Object.keys(newServiceNames).length > 0) {
        setServiceNames((prev) => ({ ...prev, ...newServiceNames }))
      }
    } catch (err) {
      setError(`録画一覧を取得できませんでした。\n${err}`)
    } finally {
      setLoading(false)
    }
  }, [nasneIp])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    const fetchServiceNames = async () => {
      try {
        const services = await NasneAPI.getServiceList(nasneIp)
        const map: Record<string, string> = {}
        services.forEach((service) => {
          const id = normalizeServiceId(service.serviceId)
          if (!id) return
          const name = service.name?.trim() || service.serviceName?.trim() || service.channelName?.trim()
          if (name) {
            map[id] = name
          }
        })
        if (Object.keys(map).length > 0) {
          setServiceNames((prev) => ({ ...prev, ...map }))
        }
      } catch {
        // 取得に失敗した場合も、録画タイトル由来の chName を残す
      }
    }
    fetchServiceNames()
  }, [nasneIp])

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

  const normalizedSearch = search.toLowerCase()
  const filtered = recordings.filter((r) => {
    const serviceName = serviceNames[normalizeServiceId(r.serviceId)] ?? ''
    return (
      !search ||
      r.title.toLowerCase().includes(normalizedSearch) ||
      (r.chName ?? '').toLowerCase().includes(normalizedSearch) ||
      serviceName.toLowerCase().includes(normalizedSearch)
    )
  })

  const getChannelGroupKey = (rec: RecordedTitle): string => {
    const serviceId = normalizeServiceId(rec.serviceId)
    if (rec.chName) return rec.chName
    if (serviceId && serviceNames[serviceId]) return serviceNames[serviceId]
    if (serviceId) return `serviceId:${serviceId}`
    return 'チャンネル不明'
  }

  const getChannelDisplayName = (rec: RecordedTitle): string | undefined => {
    if (rec.chName) return rec.chName
    const serviceId = normalizeServiceId(rec.serviceId)
    if (serviceId && serviceNames[serviceId]) return serviceNames[serviceId]
    return undefined
  }

  // グルーピング処理
  const grouped = groupBy !== 'none' ? filtered.reduce((acc, rec) => {
    let key: string

    switch (groupBy) {
      case 'title':
        key = normalizeTitle(rec.title)
        break
      case 'channel':
        key = getChannelGroupKey(rec)
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

  // グルーピングモード切り替え時に全グループを展開、トグルスイッチをリセット
  useEffect(() => {
    if (groupBy === 'none' || !grouped) {
      setExpandedGroups(new Set())
      setGroupToggleState('expand')
      return
    }
    // groupBy が変更されたときだけ全グループを展開
    // grouped が変更されるたびに実行したくないので、dependency array から grouped を削除
    setExpandedGroups(new Set(Object.keys(grouped)))
    setGroupToggleState('expand')
  }, [groupBy])

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
              aria-label="グループ化方法"
            >
              {GROUP_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* グループ展開/縮小トグルスイッチ（グルーピング時のみ表示） */}
          {groupBy !== 'none' && (
            <button 
              className={`group-toggle-switch ${groupToggleState}`}
              onClick={handleGroupToggle}
              title={groupToggleState === 'expand' ? 'すべてのグループを展開' : 'すべてのグループを縮小'}
            >
              {groupToggleState === 'expand' ? '▼' : '▶'}
            </button>
          )}

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
              <div 
                className="group-header" 
                onClick={() => handleToggleGroup(groupKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleToggleGroup(groupKey)
                  }
                }}
              >
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
                          {getChannelDisplayName(rec) && groupBy !== 'channel' && <span className="meta-chip">{getChannelDisplayName(rec)}</span>}
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
                  {getChannelDisplayName(rec) && <span className="meta-chip">{getChannelDisplayName(rec)}</span>}
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

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

type Props = { nasneIp: string }

export default function RecordingList({ nasneIp }: Props) {
  const [recordings, setRecordings] = useState<RecordedTitle[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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

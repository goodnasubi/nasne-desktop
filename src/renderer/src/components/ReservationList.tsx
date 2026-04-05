import { useState, useEffect, useCallback } from 'react'
import { NasneAPI, type Reservation } from '../api/nasne'
import { getChannelChipStyle } from '../utils/chipColors'

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

function qualityLabel(q: number): string {
  if (q === 100) return 'DR'
  if (q === 101) return '3倍'
  if (q === 102) return '5倍'
  return String(q)
}

function conditionLabel(c: string): string {
  if (c === '1')   return '単発'
  if (c === 'd')   return '毎日'
  if (c === 'w3')  return '毎週'
  if (c === 'w15') return '月〜金'
  if (c === 'w16') return '月〜土'
  return c
}

// ─── 予約作成フォーム ─────────────────────────────

type FormValues = {
  title: string
  date: string        // "YYYY-MM-DD"
  time: string        // "HH:MM"
  durationMin: string // 分単位で入力
  serviceId: string
  quality: string
  storageId: string
}

const DEFAULT_FORM: FormValues = {
  title: '',
  date: '',
  time: '',
  durationMin: '30',
  serviceId: '',
  quality: '100',
  storageId: '0'
}

function AddReservationModal({
  onClose,
  onSubmit
}: {
  onClose: () => void
  onSubmit: (values: FormValues) => Promise<void>
}) {
  const [form, setForm] = useState<FormValues>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof FormValues, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.date || !form.time || !form.serviceId) {
      setError('必須項目を入力してください')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err) {
      setError(`予約に失敗しました: ${err}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">録画予約を追加</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="field-group">
            <label className="field-label">番組名 *</label>
            <input className="field-input" type="text" placeholder="番組名を入力"
              value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>

          <div className="form-row">
            <div className="field-group">
              <label className="field-label">日付 *</label>
              <input className="field-input" type="date"
                value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">開始時刻 *</label>
              <input className="field-input" type="time"
                value={form.time} onChange={(e) => set('time', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="field-group">
              <label className="field-label">録画時間 (分) *</label>
              <input className="field-input" type="number" min="1" max="600"
                value={form.durationMin} onChange={(e) => set('durationMin', e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">サービスID *</label>
              <input className="field-input" type="text" placeholder="例: 1024"
                value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="field-group">
              <label className="field-label">録画モード</label>
              <select className="field-input" value={form.quality} onChange={(e) => set('quality', e.target.value)}>
                <option value="100">DR (最高画質)</option>
                <option value="101">3倍録画</option>
                <option value="102">5倍録画</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">保存先</label>
              <select className="field-input" value={form.storageId} onChange={(e) => set('storageId', e.target.value)}>
                <option value="0">内蔵 HDD</option>
                <option value="1">外付け HDD</option>
              </select>
            </div>
          </div>

          {error && <p className="field-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '予約中…' : '予約する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── メインコンポーネント ──────────────────────────

type MergedReservation = Reservation & { nasneIp: string; sourceKey: string }
type Props = {
  nasneIps: string[]
  canCreate?: boolean
  createNasneIp?: string
  boxNames?: Record<string, string>
}

export default function ReservationList({ nasneIps, canCreate = true, createNasneIp, boxNames = {} }: Props) {
  const [reservations, setReservations] = useState<MergedReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetch = useCallback(async () => {
    if (nasneIps.length === 0) {
      setReservations([])
      setError('nasne が未設定です。設定画面からIPアドレスを登録してください。')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const settled = await Promise.allSettled(
        nasneIps.map(async (ip) => {
          const data = await NasneAPI.getReservationList(ip)
          return { ip, data }
        })
      )

      const merged: MergedReservation[] = []
      const failedIps: string[] = []

      settled.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          merged.push(
            ...(res.value.data?.item ?? []).map((r, itemIdx) => ({
              ...r,
              nasneIp: res.value.ip,
              sourceKey: `${res.value.ip}:${r.id || itemIdx}`
            }))
          )
        } else {
          failedIps.push(nasneIps[idx] ?? 'unknown')
        }
      })

      merged.sort((a, b) => b.startDateTime.localeCompare(a.startDateTime))
      setReservations(merged)

      if (failedIps.length > 0 && merged.length > 0) {
        setError(`一部nasneで予約一覧の取得に失敗しました: ${failedIps.join(', ')}`)
      } else if (failedIps.length > 0) {
        setError(`予約一覧を取得できませんでした: ${failedIps.join(', ')}`)
      }
    } catch (err) {
      setError(`予約一覧を取得できませんでした。\n${err}`)
    } finally {
      setLoading(false)
    }
  }, [nasneIps])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async (res: MergedReservation) => {
    if (!confirm(`「${res.title}」の予約を削除しますか？\n対象: ${res.nasneIp}`)) return
    setDeletingId(res.sourceKey)
    try {
      await NasneAPI.deleteReservation(res.nasneIp, res.id)
      setReservations((prev) => prev.filter((r) => r.sourceKey !== res.sourceKey))
    } catch (err) {
      alert(`削除に失敗しました。\n${err}`)
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddReservation = async (form: FormValues) => {
    const targetIp = createNasneIp || nasneIps[0]
    if (!targetIp) {
      throw new Error('nasne が未設定です')
    }

    const startDateTime = form.date.replace(/-/g, '') + form.time.replace(':', '') + '00'
    await NasneAPI.createReservation(targetIp, {
      title: form.title,
      startDateTime,
      duration: Number(form.durationMin) * 60,
      serviceId: form.serviceId,
      quality: Number(form.quality),
      storageId: Number(form.storageId)
    })
    setShowModal(false)
    await fetch()
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><h2 className="page-title">録画予約</h2></div>
        <div className="loading-state"><div className="spinner" /><span>読み込み中...</span></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header"><h2 className="page-title">録画予約</h2></div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
          <button className="btn-secondary" onClick={fetch}>再試行</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">録画予約</h2>
          {!canCreate && <p className="page-subtitle">マージ表示中は予約追加できません。個別表示に切り替えてください。</p>}
        </div>
        <div className="header-actions">
          <span className="badge">{reservations.length} 件 / {nasneIps.length}台</span>
          {canCreate && (
            <button className="btn-primary-sm" onClick={() => setShowModal(true)}>
              ＋ 予約追加
            </button>
          )}
          <button className="btn-icon" onClick={fetch} title="更新">↻</button>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="empty-state">
          <p>予約がありません</p>
          {canCreate && (
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              最初の予約を追加
            </button>
          )}
        </div>
      ) : (
        <div className="item-list">
          {reservations.map((res) => (
            <div key={res.sourceKey} className="recording-item">
              <div className="recording-info">
                <div className="recording-title">{res.title}</div>
                <div className="recording-meta">
                  <span className="meta-chip">{formatDateTime(res.startDateTime)}</span>
                  <span className="meta-chip">{formatDuration(res.duration)}</span>
                  {res.chName && <span className="meta-chip" style={getChannelChipStyle(res.chName)}>{res.chName}</span>}
                  <span className="meta-chip meta-chip--quality">{qualityLabel(res.quality)}</span>
                  <span className="meta-chip">{conditionLabel(res.conditionId)}</span>
                  {nasneIps.length > 1 && <span className="meta-chip meta-chip--nasne" title={`nasne: ${res.nasneIp}`}>{boxNames[res.nasneIp] || res.nasneIp}</span>}
                </div>
              </div>
              <div className="recording-actions">
                <button
                  className="btn-danger-sm"
                  onClick={() => handleDelete(res)}
                  disabled={deletingId === res.sourceKey}
                >
                  {deletingId === res.sourceKey ? '削除中…' : '削除'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && canCreate && (
        <AddReservationModal
          onClose={() => setShowModal(false)}
          onSubmit={handleAddReservation}
        />
      )}
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  fetchNhkPrograms,
  NHK_SERVICES, NHK_AREAS,
  NhkProgram, NhkService,
  parseNhkTime, durationMinutes
} from '../api/nhk'
import { NasneAPI } from '../api/nasne'

// ─── 定数 ────────────────────────────────────
const PX_PER_MIN  = 3      // 1分 = 3px
const CHAN_WIDTH   = 108    // チャンネル列の幅 (px)
const ROW_HEIGHT   = 68     // 各チャンネル行の高さ (px)
const HEADER_H     = 36     // 時刻ヘッダーの高さ (px)
const DAY_START_H  = 5      // 放送日の始まり (5:00)
const TOTAL_MINS   = 24 * 60
const TOTAL_WIDTH  = TOTAL_MINS * PX_PER_MIN  // 4320px

// ─── ユーティリティ ───────────────────────────

function toJST(d: Date): Date {
  return new Date(d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
}

function dateKey(d: Date): string {
  const jst = toJST(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${jst.getFullYear()}-${pad(jst.getMonth() + 1)}-${pad(jst.getDate())}`
}

function nowMinutes(): number {
  const jst = toJST(new Date())
  const mins = jst.getHours() * 60 + jst.getMinutes()
  // 0-4:59 → 翌放送日扱いのため +1440
  return mins < DAY_START_H * 60 ? mins + TOTAL_MINS : mins
}

/** 番組の左位置 (px) */
function progLeft(startIso: string): number {
  const d = toJST(parseNhkTime(startIso))
  let mins = d.getHours() * 60 + d.getMinutes()
  if (mins < DAY_START_H * 60) mins += TOTAL_MINS
  return (mins - DAY_START_H * 60) * PX_PER_MIN
}

/** 番組の幅 (px) */
function progWidth(startIso: string, endIso: string): number {
  return Math.max(durationMinutes(startIso, endIso) * PX_PER_MIN, PX_PER_MIN * 5)
}

/** 時刻ラベル配列 (HH:mm) */
function timeLabels(): { label: string; left: number }[] {
  const labels: { label: string; left: number }[] = []
  for (let h = 0; h < 24; h++) {
    const hour = (DAY_START_H + h) % 24
    const left = h * 60 * PX_PER_MIN
    labels.push({ label: `${String(hour).padStart(2, '0')}:00`, left })
    labels.push({ label: `${String(hour).padStart(2, '0')}:30`, left: left + 30 * PX_PER_MIN })
  }
  return labels
}

/** ジャンルで色分け */
function genreColor(program: NhkProgram): string {
  const t = (program.title + (program.subtitle ?? '')).toLowerCase()
  if (t.includes('ニュース') || t.includes('報道'))  return '#1a4a7a'
  if (t.includes('スポーツ') || t.includes('野球') || t.includes('サッカー')) return '#1a5c2e'
  if (t.includes('ドラマ'))                          return '#4a1a6b'
  if (t.includes('映画') || t.includes('シネマ'))    return '#5c2a00'
  if (t.includes('アニメ'))                          return '#005c5c'
  if (t.includes('音楽'))                            return '#3d3d00'
  if (t.includes('バラエティ') || t.includes('お笑い')) return '#4a3000'
  if (t.includes('教育') || t.includes('語学'))     return '#003d4a'
  return '#2a2a3a'
}

// ─── 予約モーダル ─────────────────────────────

type ReserveModalProps = {
  program: NhkProgram
  service: NhkService
  nasneIp: string
  onClose: () => void
}

function ReserveModal({ program, service, nasneIp, onClose }: ReserveModalProps) {
  const [quality, setQuality]   = useState('100')
  const [storageId, setStorage] = useState('0')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')

  // nasne の serviceId を使う (ユーザーが設定していなければ空)
  const [serviceId, setServiceId] = useState(service.serviceId ?? '')

  const startJST    = toJST(parseNhkTime(program.start_time))
  const pad         = (n: number) => String(n).padStart(2, '0')
  const startNasne  = `${startJST.getFullYear()}${pad(startJST.getMonth() + 1)}${pad(startJST.getDate())}${pad(startJST.getHours())}${pad(startJST.getMinutes())}00`
  const dur         = durationMinutes(program.start_time, program.end_time) * 60
  const dispTime    = `${pad(startJST.getMonth() + 1)}/${pad(startJST.getDate())} ${pad(startJST.getHours())}:${pad(startJST.getMinutes())}`

  const handleReserve = async () => {
    if (!serviceId) { setError('nasne の serviceId を入力してください'); return }
    setLoading(true); setError('')
    try {
      await NasneAPI.createReservation(nasneIp, {
        title:            program.title,
        startDateTime:    startNasne,
        duration:         dur,
        broadcastingType: service.broadcastingType,
        serviceId,
        quality:          Number(quality),
        storageId:        Number(storageId)
      })
      setDone(true)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">録画予約</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {done ? (
            <div className="reserve-success">
              <span className="reserve-success-icon">✅</span>
              <p>予約しました</p>
              <p className="text-muted">{program.title}</p>
              <button className="btn-primary btn-full" style={{ marginTop: 16 }} onClick={onClose}>閉じる</button>
            </div>
          ) : (
            <>
              <div className="reserve-program-info">
                <div className="reserve-program-title">{program.title}</div>
                <div className="reserve-program-meta">
                  <span>{service.name}</span>
                  <span>・</span>
                  <span>{dispTime}</span>
                  <span>・</span>
                  <span>{Math.round(dur / 60)}分</span>
                </div>
                {program.subtitle && <p className="reserve-program-desc">{program.subtitle}</p>}
              </div>

              {/* nasne serviceId */}
              <div className="field-group">
                <label className="field-label">nasne serviceId</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="例: 1024 (録画一覧で確認)"
                  value={serviceId}
                  onChange={e => setServiceId(e.target.value)}
                />
                <span className="field-hint">
                  「録画一覧」でそのチャンネルの番組を開いて serviceId を確認してください
                </span>
              </div>

              <div className="form-row">
                <div className="field-group">
                  <label className="field-label">録画画質</label>
                  <select className="field-select" value={quality} onChange={e => setQuality(e.target.value)}>
                    <option value="100">DR（最高画質）</option>
                    <option value="101">3倍録画</option>
                    <option value="102">5倍録画</option>
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">保存先</label>
                  <select className="field-select" value={storageId} onChange={e => setStorage(e.target.value)}>
                    <option value="0">内蔵HDD</option>
                    <option value="1">外付けHDD</option>
                  </select>
                </div>
              </div>

              {error && <div className="error-banner">{error}</div>}

              <div className="modal-actions">
                <button className="btn-secondary" onClick={onClose}>キャンセル</button>
                <button className="btn-primary" onClick={handleReserve} disabled={loading}>
                  {loading ? '予約中…' : '📅 予約する'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── メインビュー ─────────────────────────────

type Props = {
  nasneIp: string
  nhkApiKey: string
  nhkArea: string
  onOpenSettings: () => void
}

export default function EpgView({ nasneIp, nhkApiKey, nhkArea, onOpenSettings }: Props) {
  const [date, setDate]         = useState(dateKey(new Date()))
  const [programs, setPrograms] = useState<Record<string, NhkProgram[]>>({})
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<{ prog: NhkProgram; svc: NhkService } | null>(null)
  const [nowX, setNowX]         = useState(0)

  const scrollRef  = useRef<HTMLDivElement>(null)
  const headerRef  = useRef<HTMLDivElement>(null)

  // 「現在」の X 座標を定期更新
  useEffect(() => {
    const update = () => {
      const mins = nowMinutes()
      setNowX((mins - DAY_START_H * 60) * PX_PER_MIN)
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [])

  // 初期スクロール位置を「現在時刻」に合わせる
  useEffect(() => {
    if (scrollRef.current && nowX > 0) {
      scrollRef.current.scrollLeft = Math.max(0, nowX - 200)
    }
  }, [nowX])

  // 横スクロール同期
  const handleScroll = useCallback(() => {
    if (scrollRef.current && headerRef.current) {
      headerRef.current.scrollLeft = scrollRef.current.scrollLeft
    }
  }, [])

  // 番組データ取得
  useEffect(() => {
    if (!nhkApiKey) return
    setLoading(true)
    setErrors({})
    setPrograms({})

    const promises = NHK_SERVICES.map(async (svc) => {
      try {
        const list = await fetchNhkPrograms(nhkApiKey, nhkArea, svc.code, date)
        return { code: svc.code, list }
      } catch (e) {
        return { code: svc.code, list: [], error: String(e) }
      }
    })

    Promise.all(promises).then((results) => {
      const newPrograms: Record<string, NhkProgram[]> = {}
      const newErrors: Record<string, string> = {}
      for (const r of results) {
        newPrograms[r.code] = r.list
        if ('error' in r && r.error) newErrors[r.code] = r.error
      }
      setPrograms(newPrograms)
      setErrors(newErrors)
      setLoading(false)
    })
  }, [nhkApiKey, nhkArea, date])

  // APIキー未設定
  if (!nhkApiKey) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-title">番組表</h2>
            <p className="page-subtitle">torne 風 EPG グリッド</p>
          </div>
        </div>
        <div className="empty-state">
          <p style={{ fontSize: 40 }}>🔑</p>
          <p>NHK 番組表 API キーが必要です</p>
          <p className="text-muted" style={{ textAlign: 'center', maxWidth: 380 }}>
            <a href="https://api-portal.nhk.or.jp" style={{ color: 'var(--accent)' }}
               onClick={e => { e.preventDefault(); window.electronAPI.openExternal('https://api-portal.nhk.or.jp') }}>
              api-portal.nhk.or.jp
            </a> でAPIキーを取得して「設定」に入力してください
          </p>
          <button className="btn-primary" onClick={onOpenSettings}>⚙️ 設定を開く</button>
        </div>
      </div>
    )
  }

  const labels = timeLabels()

  return (
    <div className="epg-page">
      {/* ヘッダー */}
      <div className="epg-topbar">
        <h2 className="epg-title">📺 番組表</h2>
        <div className="epg-controls">
          <button
            className="btn-secondary-sm"
            onClick={() => {
              const d = new Date(date)
              d.setDate(d.getDate() - 1)
              setDate(dateKey(d))
            }}
          >← 前日</button>
          <span className="epg-date-label">{date}</span>
          <button
            className="btn-secondary-sm"
            onClick={() => {
              const d = new Date(date)
              d.setDate(d.getDate() + 1)
              setDate(dateKey(d))
            }}
          >翌日 →</button>
          <button className="btn-secondary-sm" onClick={() => setDate(dateKey(new Date()))}>今日</button>
          {loading && <span className="epg-loading">読込中…</span>}
        </div>
      </div>

      <div className="epg-wrapper">
        {/* 時刻ヘッダー (横スクロール同期) */}
        <div className="epg-time-header-row">
          <div className="epg-corner" />
          <div className="epg-time-header" ref={headerRef}>
            <div className="epg-time-track" style={{ width: TOTAL_WIDTH }}>
              {labels.map(({ label, left }) => (
                <div key={label} className="epg-time-label" style={{ left }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* チャンネル行 + 番組グリッド */}
        <div className="epg-body" ref={scrollRef} onScroll={handleScroll}>
          {NHK_SERVICES.map((svc) => (
            <div key={svc.code} className="epg-row">
              {/* チャンネル名 (sticky left) */}
              <div className="epg-channel-name">
                <span className="epg-ch-label">{svc.name}</span>
                {svc.broadcastingType === 2 && <span className="epg-ch-badge">BS</span>}
              </div>

              {/* 番組ブロック */}
              <div className="epg-programs-track" style={{ width: TOTAL_WIDTH }}>
                {/* 現在時刻インジケータ */}
                {date === dateKey(new Date()) && (
                  <div className="epg-now-line" style={{ left: nowX }} />
                )}

                {errors[svc.code] ? (
                  <div className="epg-error-strip">取得失敗: {errors[svc.code]}</div>
                ) : (
                  (programs[svc.code] ?? []).map((prog, i) => {
                    const left  = progLeft(prog.start_time)
                    const width = progWidth(prog.start_time, prog.end_time)
                    const color = genreColor(prog)
                    return (
                      <button
                        key={prog.id ?? i}
                        className="epg-program"
                        style={{ left, width, background: color }}
                        onClick={() => setSelected({ prog, svc })}
                        title={`${prog.title}\n${prog.subtitle ?? ''}`}
                      >
                        <span className="epg-prog-title">{prog.title}</span>
                        {prog.subtitle && (
                          <span className="epg-prog-sub">{prog.subtitle}</span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 予約モーダル */}
      {selected && (
        <ReserveModal
          program={selected.prog}
          service={selected.svc}
          nasneIp={nasneIp}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

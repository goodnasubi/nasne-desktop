import { useState, useEffect, useCallback } from 'react'
import { NasneAPI, type BoxStatus } from '../api/nasne'

type Props = { nasneIp: string }

/**
 * ライブ視聴画面
 *
 * nasne のライブストリーミングは DTCP-IP (デジタル著作権管理) で保護されており、
 * 専用クライアントが必要です。このアプリからは:
 *   1. 現在の nasne ステータスを表示
 *   2. DLNA / DTCP-IP 対応アプリへの案内を表示
 *   3. 録画済みコンテンツの contentUrl をコピーして外部プレイヤーで再生 (参考)
 * する機能を提供します。
 */
export default function LiveView({ nasneIp }: Props) {
  const [status, setStatus] = useState<BoxStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await NasneAPI.getBoxStatus(nasneIp)
      setStatus(res?.box?.[0] ?? null)
    } catch (err) {
      setError(`ステータスを取得できませんでした: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [nasneIp])

  useEffect(() => { fetch() }, [fetch])

  // ステータスコード → 日本語
  const statusText = (code?: number) => {
    if (code === undefined) return '—'
    if (code === 0) return '待機中'
    if (code === 1) return '録画中'
    if (code === 2) return '予約待機'
    return `コード: ${code}`
  }

  const statusColor = (code?: number) => {
    if (code === 1) return '#ff453a'
    if (code === 2) return '#ff9f0a'
    return '#30d158'
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">ライブ視聴</h2>
        <div className="header-actions">
          <button className="btn-icon" onClick={fetch} title="更新">↻</button>
        </div>
      </div>

      {/* nasne ステータス */}
      <div className="live-section">
        <h3 className="section-title">デバイス状態</h3>
        {loading ? (
          <div className="loading-state"><div className="spinner" /><span>読み込み中...</span></div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p className="error-text">{error}</p>
            <button className="btn-secondary" onClick={fetch}>再試行</button>
          </div>
        ) : (
          <div className="status-card">
            <div className="status-row">
              <span className="status-label">製品名</span>
              <span className="status-value">{status?.product ?? 'nasne'}</span>
            </div>
            <div className="status-row">
              <span className="status-label">状態</span>
              <span className="status-value" style={{ color: statusColor(status?.status) }}>
                ● {statusText(status?.status)}
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">ホスト</span>
              <span className="status-value mono">{nasneIp}</span>
            </div>
          </div>
        )}
      </div>

      {/* ライブ視聴の説明 */}
      <div className="live-section">
        <h3 className="section-title">ライブ視聴について</h3>
        <div className="info-card">
          <div className="info-icon">📡</div>
          <div className="info-content">
            <p className="info-text">
              nasne のライブストリーミングは <strong>DTCP-IP</strong> で著作権保護されており、
              専用の対応クライアントが必要です。
            </p>
            <p className="info-text">
              以下の方法でライブ視聴ができます:
            </p>
            <ul className="info-list">
              <li>
                <strong>Infuse</strong> (iOS / macOS) — DLNA / DTCP-IP 対応
              </li>
              <li>
                <strong>TwonkyBeam</strong> (iOS / Android)
              </li>
              <li>
                <strong>Sony の「Video & TV SideView」</strong> — 公式アプリ
              </li>
              <li>
                <strong>ブラウザ</strong> — nasne HOME ({nasneIp}) へアクセス
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* nasne HOME へのリンク案内 */}
      <div className="live-section">
        <h3 className="section-title">nasne HOME を開く</h3>
        <div className="info-card">
          <div className="info-icon">🌐</div>
          <div className="info-content">
            <p className="info-text">
              ブラウザから nasne の設定・管理画面を開くことができます。
            </p>
            <div className="url-display">
              <code className="url-code">http://{nasneIp}/</code>
              <button
                className="btn-secondary-sm"
                onClick={() => navigator.clipboard.writeText(`http://${nasneIp}/`)}
              >
                コピー
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

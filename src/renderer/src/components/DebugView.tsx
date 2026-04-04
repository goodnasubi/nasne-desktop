import { useState } from 'react'
import { STATUS_PORT, REMOTE_PORT, inspectCodePoints } from '../api/nasne'

// ─── テストするエンドポイント一覧 ─────────────────
const ENDPOINTS = [
  // ── ステータス系 (比較用) ──────────────────────
  { label: '[status] HDD情報',                              port: STATUS_PORT, path: '/status/HDDInfoGet' },
  { label: '[status] ボックス名',                           port: STATUS_PORT, path: '/status/boxNameGet' },

  // ── 録画: パラメータを段階的に追加 ───────────────
  { label: '[recorded] パラメータなし',                     port: REMOTE_PORT, path: '/recorded/titleListGet' },
  { label: '[recorded] requestedCount=10 のみ',            port: REMOTE_PORT, path: '/recorded/titleListGet?requestedCount=10' },
  { label: '[recorded] startingIndex=0&requestedCount=10', port: REMOTE_PORT, path: '/recorded/titleListGet?startingIndex=0&requestedCount=10' },
  { label: '[recorded] + searchCriteria=0',                port: REMOTE_PORT, path: '/recorded/titleListGet?searchCriteria=0&startingIndex=0&requestedCount=10' },
  { label: '[recorded] + filter=0',                        port: REMOTE_PORT, path: '/recorded/titleListGet?searchCriteria=0&filter=0&startingIndex=0&requestedCount=10' },
  { label: '[recorded] + sortCriteria=',                   port: REMOTE_PORT, path: '/recorded/titleListGet?searchCriteria=0&filter=0&startingIndex=0&requestedCount=10&sortCriteria=' },
  { label: '[recorded] requestedCount=0 (元のリクエスト)', port: REMOTE_PORT, path: '/recorded/titleListGet?searchCriteria=0&filter=0&startingIndex=0&requestedCount=0&sortCriteria=' },

  // ── 予約 ────────────────────────────────────────
  { label: '[schedule] 予約一覧 requestedCount=10',        port: REMOTE_PORT, path: '/schedule/reservedListGet?startingIndex=0&requestedCount=10' },
  { label: '[schedule] 予約一覧 全パラメータ',              port: REMOTE_PORT, path: '/schedule/reservedListGet?searchCriteria=0&filter=0&startingIndex=0&requestedCount=0&sortCriteria=' },

  // ── チャンネル一覧 ────────────────────────────────
  { label: '[service] schedule/serviceListGet (フルパラメ)', port: REMOTE_PORT, path: '/schedule/serviceListGet?searchCriteria=0&filter=0&startingIndex=0&requestedCount=0&sortCriteria=0' },
  { label: '[service] schedule/serviceListGet (最小パラメ)', port: REMOTE_PORT, path: '/schedule/serviceListGet?searchCriteria=0&sortCriteria=0' },
  { label: '[service] schedule/serviceListGet (パラメなし)', port: REMOTE_PORT, path: '/schedule/serviceListGet' },
  { label: '[service] recorded/serviceListGet (フルパラメ)', port: REMOTE_PORT, path: '/recorded/serviceListGet?searchCriteria=0&filter=0&startingIndex=0&requestedCount=0&sortCriteria=0' },
  { label: '[service] recorded/serviceListGet (パラメなし)', port: REMOTE_PORT, path: '/recorded/serviceListGet' },
  { label: '[service] status/serviceListGet',              port: STATUS_PORT, path: '/status/serviceListGet' },
  { label: '[service] schedule/channelListGet',            port: REMOTE_PORT, path: '/schedule/channelListGet?searchCriteria=0&sortCriteria=0' },
  { label: '[service] recorded/channelListGet',            port: REMOTE_PORT, path: '/recorded/channelListGet?searchCriteria=0&sortCriteria=0' },
  { label: '[service] schedule/serviceInfoGet',            port: REMOTE_PORT, path: '/schedule/serviceInfoGet?searchCriteria=0&sortCriteria=0' },
]

type Result = {
  label: string
  success: boolean
  raw: unknown
  error?: string
}

// ─── タイトル文字コード調査パネル ─────────────────────

type TitleInspectEntry = {
  title: string
  codePoints: string[]
}

function TitleInspector({ nasneIp }: { nasneIp: string }) {
  const [entries, setEntries]   = useState<TitleInspectEntry[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const run = async () => {
    setLoading(true)
    setError('')
    setEntries([])
    try {
      const res = await window.electronAPI.nasneRequest({
        ip: nasneIp,
        port: REMOTE_PORT,
        path: '/recorded/titleListGet?searchCriteria=0&filter=0&startingIndex=0&requestedCount=10&sortCriteria=0',
        method: 'GET'
      })
      if (!res.success) { setError(res.error ?? '取得失敗'); setLoading(false); return }
      const data = res.data as Record<string, unknown>
      // item 配列を抽出
      let items: Array<Record<string, unknown>> = []
      if (Array.isArray(data?.item)) {
        items = data.item as Array<Record<string, unknown>>
      } else {
        for (const val of Object.values(data ?? {})) {
          if (val && typeof val === 'object') {
            const nested = val as Record<string, unknown>
            if (Array.isArray(nested.item)) { items = nested.item as Array<Record<string, unknown>>; break }
          }
        }
      }
      const result: TitleInspectEntry[] = items.slice(0, 10).map((item) => {
        const raw = String(item.title ?? '')
        return { title: raw, codePoints: inspectCodePoints(raw) }
      })
      setEntries(result)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="debug-hint-box" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <strong>🔬 タイトル文字コード調査</strong>
        <button className="btn-secondary-sm" onClick={run} disabled={loading}>
          {loading ? '取得中…' : '▶ 録画タイトルを調査'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          nasne から生のタイトルを取得し、各文字のコードポイントを表示します
        </span>
      </div>

      {error && <div className="debug-error-box">エラー: {error}</div>}

      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((e, i) => (
            <div key={i} style={{ background: 'var(--bg-primary)', borderRadius: 6, overflow: 'hidden' }}>
              <div
                style={{ padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{e.title || '(空タイトル)'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{expanded === i ? '▲' : '▼'}</span>
              </div>
              {expanded === i && (
                <div style={{ padding: '4px 10px 10px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    コードポイント一覧 ({e.codePoints.length} 文字):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {e.codePoints.map((cp, j) => {
                      // ARIB 文字 (U+1F2xx) はオレンジ、PUA はグレー、通常は暗め
                      const isArib = cp.includes('[')
                      const style: React.CSSProperties = {
                        fontSize: 10,
                        fontFamily: 'monospace',
                        padding: '2px 5px',
                        borderRadius: 3,
                        background: isArib ? '#5c3000' : '#2a2a3a',
                        color: isArib ? '#ffaa44' : 'var(--text-secondary)',
                        border: isArib ? '1px solid #ff8800' : '1px solid var(--border)',
                      }
                      return <span key={j} style={style}>{cp}</span>
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !loading && !error && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          ボタンを押すと、録画一覧の先頭10件のタイトルを文字単位で分解して表示します。
          ARIB 特殊文字 (U+1F2xx) が含まれている場合はオレンジ色で強調されます。
        </p>
      )}
    </div>
  )
}

// ─── メインビュー ─────────────────────────────────────

type Props = { nasneIp: string }

export default function DebugView({ nasneIp }: Props) {
  const [results, setResults] = useState<Result[]>([])
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const runAll = async () => {
    setRunning(true)
    setResults([])
    const out: Result[] = []

    for (const ep of ENDPOINTS) {
      try {
        const res = await window.electronAPI.nasneRequest({
          ip: nasneIp,
          port: ep.port,
          path: ep.path,
          method: 'GET'
        })
        out.push({
          label: ep.label,
          success: res.success,
          raw: res.data,
          error: res.error
        })
      } catch (e) {
        out.push({ label: ep.label, success: false, raw: null, error: String(e) })
      }
      setResults([...out]) // 逐次表示
    }

    setRunning(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">デバッグ / 接続テスト</h2>
          <p className="page-subtitle">
            nasne が返す生のレスポンスを確認できます
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={runAll}
            disabled={running}
          >
            {running ? 'テスト中…' : '▶ 全エンドポイントをテスト'}
          </button>
        </div>
      </div>

      {/* 接続情報 */}
      <div className="debug-info-bar">
        <span className="debug-target">🎯 対象: <strong>{nasneIp}</strong></span>
        <span className="debug-ports">
          ステータス: <code>:{STATUS_PORT}</code> &nbsp;|&nbsp; 録画: <code>:{REMOTE_PORT}</code>
        </span>
      </div>

      {/* 🔬 タイトル文字コード調査 */}
      <TitleInspector nasneIp={nasneIp} />

      {results.length === 0 && !running && (
        <div className="empty-state" style={{ paddingTop: '20px' }}>
          <p>「▶ 全エンドポイントをテスト」を押すと nasne への疎通確認を行います</p>
        </div>
      )}

      {/* 結果一覧 */}
      <div className="debug-results">
        {results.map((r, i) => (
          <div key={i} className={`debug-result-item ${r.success ? 'debug-result--ok' : 'debug-result--err'}`}>
            <div
              className="debug-result-header"
              onClick={() => setExpanded(expanded === i ? null : i)}
              role="button"
            >
              <span className="debug-status-dot">{r.success ? '✅' : '❌'}</span>
              <span className="debug-result-label">{r.label}</span>
              {r.success && (
                <span className="debug-item-count">
                  {countItems(r.raw)} 件
                </span>
              )}
              {!r.success && (
                <span className="debug-error-preview">{r.error}</span>
              )}
              <span className="debug-expand">{expanded === i ? '▲' : '▼'}</span>
            </div>

            {expanded === i && (
              <div className="debug-result-body">
                <div className="debug-browser-bar">
                  <code className="debug-url-text">
                    http://{nasneIp}:{ENDPOINTS[i]?.port}{ENDPOINTS[i]?.path}
                  </code>
                  <button
                    className="btn-secondary-sm"
                    onClick={() => {
                      const url = `http://${nasneIp}:${ENDPOINTS[i]?.port}${ENDPOINTS[i]?.path}`
                      ;(window as any).electronAPI?.openExternal?.(url) ?? window.open(url, '_blank')
                    }}
                  >
                    ブラウザで開く
                  </button>
                </div>
                {r.error && (
                  <div className="debug-error-box">
                    <strong>エラー:</strong> {r.error}
                  </div>
                )}
                <pre className="debug-json">
                  {JSON.stringify(r.raw, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}

        {/* ローディング中のプレースホルダー */}
        {running && results.length < ENDPOINTS.length && (
          <div className="debug-result-item">
            <div className="debug-result-header">
              <div className="spinner" style={{ width: 16, height: 16 }} />
              <span className="debug-result-label" style={{ color: 'var(--text-muted)' }}>
                {ENDPOINTS[results.length]?.label} を確認中...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 全テスト完了後のヒント */}
      {results.length === ENDPOINTS.length && !running && (
        <div className="debug-hint-box">
          <strong>💡 診断のヒント</strong>
          <ul className="info-list" style={{ marginTop: 8 }}>
            <li>
              <strong>❌ タイムアウト</strong> — IPアドレスを確認してください。
              nasne と同じネットワーク上にいるか確認を。
            </li>
            <li>
              <strong>✅ だが録画が空</strong> — 上のJSON を展開して実際のキー名を確認してください。
              <code>item</code> 以外のキー名の場合は下記手順で修正できます。
            </li>
            <li>
              <strong>✅ HDD 情報だけ取れる</strong> — ポート 64220 がブロックされている可能性があります。
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

/** レスポンスから item 数を推測してカウント */
function countItems(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '—'
  const obj = raw as Record<string, unknown>

  if (Array.isArray(obj.item)) return String(obj.item.length)
  if (typeof obj.totalMatches === 'number') return `${obj.totalMatches}`

  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      const nested = val as Record<string, unknown>
      if (Array.isArray(nested.item)) return String(nested.item.length)
    }
  }
  return '—'
}

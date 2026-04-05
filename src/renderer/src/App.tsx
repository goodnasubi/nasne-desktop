import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import RecordingList from './components/RecordingList'
import ReservationList from './components/ReservationList'
import StorageInfo from './components/StorageInfo'
import LiveView from './components/LiveView'
import DebugView from './components/DebugView'
import SearchView from './components/SearchView'
import EpgView from './components/EpgView'
import { NHK_AREAS } from './api/nhk'

export type Tab = 'recordings' | 'reservations' | 'search' | 'epg' | 'storage' | 'live' | 'debug'

const TAB_META: Record<Tab, { label: string; icon: string }> = {
  recordings: { label: '録画一覧', icon: '🎬' },
  reservations: { label: '録画予約', icon: '📅' },
  search: { label: '予約追加', icon: '➕' },
  epg: { label: '番組表', icon: '📺' },
  storage: { label: 'ストレージ', icon: '💾' },
  live: { label: 'ライブ視聴', icon: '📡' },
  debug: { label: '接続テスト', icon: '🔧' }
}

// ─────────────────────────────────────────────
// 初回設定画面 (nasne IP 入力)
// ─────────────────────────────────────────────
type SetupProps = {
  onSave: (ip: string, nhkApiKey: string, nhkArea: string) => void
  currentIp: string
  currentNhkApiKey: string
  currentNhkArea: string
}

function SetupScreen({ onSave, currentIp, currentNhkApiKey, currentNhkArea }: SetupProps) {
  const [ip, setIp]               = useState(currentIp)
  const [nhkApiKey, setNhkApiKey] = useState(currentNhkApiKey)
  const [nhkArea, setNhkArea]     = useState(currentNhkArea || '120')
  const [error, setError]         = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = ip.trim()
    if (!trimmed) { setError('IPアドレスを入力してください'); return }
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(trimmed)) { setError('例: 192.168.1.100 の形式で入力してください'); return }
    onSave(trimmed, nhkApiKey.trim(), nhkArea)
  }

  return (
    <div className="setup-screen">
      <div className="setup-card" style={{ width: 420 }}>
        <div className="setup-icon">📺</div>
        <h1 className="setup-title">nasne Desktop</h1>
        <p className="setup-desc">接続設定を入力してください</p>

        <form onSubmit={handleSubmit} className="setup-form">
          {/* nasne IP */}
          <div className="field-group">
            <label className="field-label" htmlFor="ip-input">nasne IPアドレス</label>
            <input
              id="ip-input" type="text"
              className={`field-input ${error ? 'field-input--error' : ''}`}
              value={ip}
              onChange={e => { setIp(e.target.value); setError('') }}
              placeholder="192.168.1.100"
              autoFocus
            />
            {error && <span className="field-error">{error}</span>}
          </div>

          {/* 区切り */}
          <div className="setup-divider">
            <span>NHK 番組表 API（任意）</span>
          </div>

          {/* NHK API key */}
          <div className="field-group">
            <label className="field-label" htmlFor="nhk-key">
              NHK API キー
              <a
                href="#"
                className="setup-link"
                onClick={e => { e.preventDefault(); window.electronAPI?.openExternal('https://api-portal.nhk.or.jp') }}
              > 取得する ↗</a>
            </label>
            <input
              id="nhk-key" type="text"
              className="field-input"
              value={nhkApiKey}
              onChange={e => setNhkApiKey(e.target.value)}
              placeholder="APIキーを貼り付け（任意）"
            />
          </div>

          {/* エリア */}
          <div className="field-group">
            <label className="field-label" htmlFor="nhk-area">放送エリア</label>
            <select
              id="nhk-area"
              className="field-select"
              value={nhkArea}
              onChange={e => setNhkArea(e.target.value)}
            >
              {NHK_AREAS.map(a => (
                <option key={a.code} value={a.code}>{a.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary btn-full">保存して接続</button>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// メインアプリ
// ─────────────────────────────────────────────
export default function App() {
  const [nasneIp, setNasneIp]       = useState(() => localStorage.getItem('nasneIp') ?? '')
  const [nhkApiKey, setNhkApiKey]   = useState(() => localStorage.getItem('nhkApiKey') ?? '')
  const [nhkArea, setNhkArea]       = useState(() => localStorage.getItem('nhkArea') ?? '120')
  const [showSetup, setShowSetup]   = useState(() => !localStorage.getItem('nasneIp'))
  const [activeTab, setActiveTab]   = useState<Tab>('recordings')
  const [now, setNow]               = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000 * 30)
    return () => window.clearInterval(timer)
  }, [])

  const currentTime = useMemo(
    () => now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    [now]
  )

  const currentDate = useMemo(
    () => now.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }),
    [now]
  )

  const handleSave = (ip: string, apiKey: string, area: string) => {
    setNasneIp(ip);    localStorage.setItem('nasneIp', ip)
    setNhkApiKey(apiKey); localStorage.setItem('nhkApiKey', apiKey)
    setNhkArea(area);  localStorage.setItem('nhkArea', area)
    setShowSetup(false)
  }

  if (showSetup || !nasneIp) {
    return (
      <SetupScreen
        onSave={handleSave}
        currentIp={nasneIp}
        currentNhkApiKey={nhkApiKey}
        currentNhkArea={nhkArea}
      />
    )
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        nasneIp={nasneIp}
        onTabChange={setActiveTab}
        onSettingsClick={() => setShowSetup(true)}
      />
      <section className="torne-stage">
        <header className="torne-hub-bar">
          <div className="torne-hub-now">
            <span className="torne-hub-icon">{TAB_META[activeTab].icon}</span>
            <div className="torne-hub-meta">
              <span className="torne-hub-label">{TAB_META[activeTab].label}</span>
              <span className="torne-hub-sub">nasne / {nasneIp}</span>
            </div>
          </div>

          <div className="torne-channel-strip" role="tablist" aria-label="クイック切り替え">
            {(['recordings', 'reservations', 'epg', 'live'] as Tab[]).map((tab) => (
              <button
                key={tab}
                className={`torne-channel-chip ${activeTab === tab ? 'torne-channel-chip--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <span>{TAB_META[tab].icon}</span>
                <span>{TAB_META[tab].label}</span>
              </button>
            ))}
          </div>

          <div className="torne-hub-clock">
            <div className="torne-hub-date">{currentDate}</div>
            <div className="torne-hub-time">{currentTime}</div>
            <button className="torne-settings-btn" onClick={() => setShowSetup(true)}>設定</button>
          </div>
        </header>

        <div className="torne-content-frame">
          <main className="main-content">
            {activeTab === 'recordings'   && <RecordingList  nasneIp={nasneIp} />}
            {activeTab === 'reservations' && <ReservationList nasneIp={nasneIp} />}
            {activeTab === 'search'       && <SearchView      nasneIp={nasneIp} />}
            {activeTab === 'epg'          && (
              <EpgView
                nasneIp={nasneIp}
                nhkApiKey={nhkApiKey}
                nhkArea={nhkArea}
                onOpenSettings={() => setShowSetup(true)}
              />
            )}
            {activeTab === 'storage'      && <StorageInfo     nasneIp={nasneIp} />}
            {activeTab === 'live'         && <LiveView        nasneIp={nasneIp} />}
            {activeTab === 'debug'        && <DebugView       nasneIp={nasneIp} />}
          </main>
        </div>
      </section>
    </div>
  )
}

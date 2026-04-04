import { useState } from 'react'
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
  )
}

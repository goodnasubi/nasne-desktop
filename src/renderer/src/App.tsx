import { useEffect, useState } from 'react'
import HomeScreen from './components/HomeScreen'
import TopBar from './components/TopBar'
import RecordingList from './components/RecordingList'
import ReservationList from './components/ReservationList'
import StorageInfo from './components/StorageInfo'
import LiveView from './components/LiveView'
import DebugView from './components/DebugView'
import SearchView from './components/SearchView'
import EpgView from './components/EpgView'
import { NHK_AREAS } from './api/nhk'
import { NasneAPI } from './api/nasne'

export type Tab = 'home' | 'recordings' | 'reservations' | 'search' | 'epg' | 'storage' | 'live' | 'debug'

type NasneView = 'all' | string

const sectionMap: Record<string, { label: string; sublabel: string }> = {
  recordings:   { label: 'VIDEO',   sublabel: 'ビデオ' },
  reservations: { label: 'RESERVE', sublabel: '予約' },
  epg:          { label: 'GUIDE',   sublabel: '番組表' },
  search:       { label: 'SEARCH',  sublabel: '検索' },
  live:         { label: 'LIVE',    sublabel: 'ライブ' },
  storage:      { label: 'STORAGE', sublabel: 'ストレージ' },
  debug:        { label: 'DEBUG',   sublabel: 'テスト' },
}

const MERGE_SUPPORTED_TABS: Tab[] = ['recordings', 'reservations', 'storage']

function parseNasneIps(input: string): { ips: string[]; invalid: string[] } {
  const chunks = input
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean)

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
  const unique: string[] = []
  const invalid: string[] = []

  chunks.forEach((ip) => {
    if (!ipRegex.test(ip)) {
      invalid.push(ip)
      return
    }
    if (!unique.includes(ip)) {
      unique.push(ip)
    }
  })

  return { ips: unique, invalid }
}

function getStoredNasneIps(): string[] {
  const rawList = localStorage.getItem('nasneIps')
  if (rawList) {
    try {
      const parsed = JSON.parse(rawList)
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean)
      }
    } catch {
      // ignore
    }
  }

  const legacy = localStorage.getItem('nasneIp')
  return legacy ? [legacy] : []
}

// ─────────────────────────────────────────────
// 初回設定画面 (nasne IP 入力)
// ─────────────────────────────────────────────
type SetupProps = {
  onSave: (ips: string[], nhkApiKey: string, nhkArea: string) => void
  currentIps: string[]
  currentNhkApiKey: string
  currentNhkArea: string
}

function SetupScreen({ onSave, currentIps, currentNhkApiKey, currentNhkArea }: SetupProps) {
  const [ipInput, setIpInput]       = useState(currentIps.join('\n'))
  const [nhkApiKey, setNhkApiKey]   = useState(currentNhkApiKey)
  const [nhkArea, setNhkArea]       = useState(currentNhkArea || '120')
  const [error, setError]           = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { ips, invalid } = parseNasneIps(ipInput)
    if (ips.length === 0) {
      setError('nasne IPアドレスを1つ以上入力してください')
      return
    }
    if (invalid.length > 0) {
      setError(`IP形式が不正です: ${invalid[0]}`)
      return
    }
    onSave(ips, nhkApiKey.trim(), nhkArea)
  }

  return (
    <div className="setup-screen">
      <div className="setup-card" style={{ width: 460 }}>
        <div className="setup-icon">📺</div>
        <h1 className="setup-title">nasne Desktop</h1>
        <p className="setup-desc">接続設定を入力してください</p>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="field-group">
            <label className="field-label" htmlFor="ip-input">nasne IPアドレス（複数可）</label>
            <textarea
              id="ip-input"
              className={`field-input ${error ? 'field-input--error' : ''}`}
              value={ipInput}
              onChange={e => { setIpInput(e.target.value); setError('') }}
              placeholder={'192.168.1.100\n192.168.1.101'}
              rows={4}
              autoFocus
            />
            <span className="setup-hint">改行またはカンマ区切りで複数台を登録できます。</span>
            {error && <span className="field-error">{error}</span>}
          </div>

          <div className="setup-divider">
            <span>NHK 番組表 API（任意）</span>
          </div>

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

export default function App() {
  const [nasneIps, setNasneIps]     = useState<string[]>(() => getStoredNasneIps())
  const [nasneView, setNasneView]   = useState<NasneView>('all')
  const [nhkApiKey, setNhkApiKey]   = useState(() => localStorage.getItem('nhkApiKey') ?? '')
  const [nhkArea, setNhkArea]       = useState(() => localStorage.getItem('nhkArea') ?? '120')
  const [showSetup, setShowSetup]   = useState(() => getStoredNasneIps().length === 0)
  const [activeTab, setActiveTab]   = useState<Tab>('home')
  const [boxNames, setBoxNames]     = useState<Record<string, string>>({})

  // nasne ボックス名をフェッチ（IP → 名前のマッピング）
  useEffect(() => {
    if (nasneIps.length === 0) return
    Promise.allSettled(
      nasneIps.map(async (ip) => {
        try {
          const res = await NasneAPI.getBoxName(ip)
          return { ip, name: (res as { name?: string }).name?.trim() || ip }
        } catch {
          return { ip, name: ip }
        }
      })
    ).then((settled) => {
      const names: Record<string, string> = {}
      settled.forEach((res) => {
        if (res.status === 'fulfilled') {
          names[res.value.ip] = res.value.name
        }
      })
      setBoxNames(names)
    })
  }, [nasneIps])

  useEffect(() => {
    if (nasneView !== 'all' && !nasneIps.includes(nasneView)) {
      setNasneView('all')
    }
  }, [nasneIps, nasneView])

  const primaryNasneIp = nasneIps[0] ?? ''
  const mergeSupported = MERGE_SUPPORTED_TABS.includes(activeTab)
  const effectiveView: NasneView = mergeSupported ? nasneView : (nasneView === 'all' ? primaryNasneIp : nasneView)
  const targetNasneIps = effectiveView === 'all' ? nasneIps : [effectiveView]
  const targetNasneIp = targetNasneIps[0] ?? ''

  const handleSave = (ips: string[], apiKey: string, area: string) => {
    setNasneIps(ips)
    setNasneView('all')
    localStorage.setItem('nasneIps', JSON.stringify(ips))
    localStorage.setItem('nasneIp', ips[0])
    localStorage.setItem('nasneView', 'all')
    setNhkApiKey(apiKey)
    localStorage.setItem('nhkApiKey', apiKey)
    setNhkArea(area)
    localStorage.setItem('nhkArea', area)
    setShowSetup(false)
  }

  const handleChangeNasneView = (value: string) => {
    const nextView: NasneView = value === 'all' ? 'all' : value
    setNasneView(nextView)
    localStorage.setItem('nasneView', nextView)
  }

  if (showSetup || nasneIps.length === 0) {
    return (
      <SetupScreen
        onSave={handleSave}
        currentIps={nasneIps}
        currentNhkApiKey={nhkApiKey}
        currentNhkArea={nhkArea}
      />
    )
  }

  if (activeTab === 'home') {
    return (
      <HomeScreen
        nasneIps={nasneIps}
        boxNames={boxNames}
        onNavigate={setActiveTab}
        onOpenSettings={() => setShowSetup(true)}
      />
    )
  }

  const section = sectionMap[activeTab] ?? { label: activeTab.toUpperCase(), sublabel: '' }

  return (
    <div className="app-layout-vertical">
      <TopBar
        sectionLabel={section.label}
        sectionSublabel={section.sublabel}
        nasneIps={nasneIps}
        boxNames={boxNames}
        nasneView={nasneView}
        onNasneChange={handleChangeNasneView}
        onHome={() => setActiveTab('home')}
        onOpenSettings={() => setShowSetup(true)}
      />

      {!mergeSupported && nasneView === 'all' && nasneIps.length > 1 && (
        <div className="nasne-mode-notice">
          この画面はマージ表示に未対応のため、{boxNames[targetNasneIp] || targetNasneIp} を表示しています。
        </div>
      )}

      <div className="torne-content-frame">
        <main className="main-content">
          {activeTab === 'recordings'   && <RecordingList nasneIps={targetNasneIps} boxNames={boxNames} />}
          {activeTab === 'reservations' && (
            <ReservationList
              nasneIps={targetNasneIps}
              canCreate={effectiveView !== 'all'}
              createNasneIp={targetNasneIp}
              boxNames={boxNames}
            />
          )}
          {activeTab === 'search'       && <SearchView nasneIp={targetNasneIp} />}
          {activeTab === 'epg'          && (
            <EpgView
              nasneIp={targetNasneIp}
              nhkApiKey={nhkApiKey}
              nhkArea={nhkArea}
              onOpenSettings={() => setShowSetup(true)}
            />
          )}
          {activeTab === 'storage'      && <StorageInfo nasneIps={targetNasneIps} />}
          {activeTab === 'live'         && <LiveView nasneIp={targetNasneIp} />}
          {activeTab === 'debug'        && <DebugView nasneIp={targetNasneIp} />}
        </main>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { type Tab } from '../App'

type Props = {
  nasneIps: string[]
  boxNames?: Record<string, string>
  onNavigate: (tab: Tab) => void
  onOpenSettings: () => void
}

export default function HomeScreen({ nasneIps, boxNames = {}, onNavigate, onOpenSettings }: Props) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const tiles: { id: Tab; icon: string; label: string; sublabel: string }[] = [
    { id: 'recordings',   icon: '🎬', label: 'VIDEO',   sublabel: 'ビデオ' },
    { id: 'reservations', icon: '📅', label: 'RESERVE', sublabel: '予約' },
    { id: 'epg',          icon: '📺', label: 'GUIDE',   sublabel: '番組表' },
    { id: 'search',       icon: '🔍', label: 'SEARCH',  sublabel: '検索' },
    { id: 'live',         icon: '📡', label: 'LIVE',    sublabel: 'ライブ' },
    { id: 'storage',      icon: '💾', label: 'STORAGE', sublabel: 'ストレージ' },
    { id: 'debug',        icon: '🔧', label: 'DEBUG',   sublabel: 'テスト' },
  ]

  const nasneLabel =
    nasneIps.length > 0
      ? boxNames[nasneIps[0]] || nasneIps[0]
      : '未接続'

  return (
    <div className="home-screen">
      <div className="home-header">
        <span className="home-app-name">nasne Desktop</span>
        <span className="home-nasne-name">
          📡 {nasneLabel}{nasneIps.length > 1 ? ` 他${nasneIps.length - 1}台` : ''}
        </span>
        <div className="home-header-right">
          <span className="home-clock">
            {now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button className="home-settings-btn" onClick={onOpenSettings} title="設定">
            ⚙
          </button>
        </div>
      </div>
      <div className="home-tiles">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            className="home-tile"
            onClick={() => onNavigate(tile.id)}
          >
            <span className="home-tile-icon">{tile.icon}</span>
            <span className="home-tile-label">{tile.label}</span>
            <span className="home-tile-sublabel">{tile.sublabel}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

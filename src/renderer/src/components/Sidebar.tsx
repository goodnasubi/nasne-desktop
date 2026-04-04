import type { Tab } from '../App'

type NavItem = {
  id: Tab
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'recordings',   label: '録画一覧',   icon: '🎬' },
  { id: 'reservations', label: '録画予約',   icon: '📅' },
  { id: 'epg',          label: '番組表',     icon: '📺' },
  { id: 'search',       label: '予約追加',   icon: '➕' },
  { id: 'storage',      label: 'ストレージ', icon: '💾' },
  { id: 'live',         label: 'ライブ視聴', icon: '📡' },
  { id: 'debug',        label: '接続テスト', icon: '🔧' }
]

type Props = {
  activeTab: Tab
  nasneIp: string
  onTabChange: (tab: Tab) => void
  onSettingsClick: () => void
}

export default function Sidebar({ activeTab, nasneIp, onTabChange, onSettingsClick }: Props) {
  return (
    <aside className="sidebar">
      {/* ロゴ・タイトル */}
      <div className="sidebar-header">
        <span className="sidebar-logo">📺</span>
        <div>
          <div className="sidebar-app-name">nasne Desktop</div>
          <div className="sidebar-ip">{nasneIp}</div>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'nav-item--active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 設定ボタン */}
      <div className="sidebar-footer">
        <button className="nav-item" onClick={onSettingsClick}>
          <span className="nav-item-icon">⚙️</span>
          <span className="nav-item-label">設定</span>
        </button>
      </div>
    </aside>
  )
}

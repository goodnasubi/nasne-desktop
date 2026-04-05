import { useEffect, useState } from 'react'
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
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved === null) return true
    return saved === '1'
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* ロゴ・タイトル */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="sidebar-logo">📺</span>
          <div className="sidebar-title-wrap">
            <div className="sidebar-app-name">nasne Desktop</div>
            <div className="sidebar-ip">{nasneIp}</div>
          </div>
        </div>

        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを縮小'}
          title={collapsed ? '展開' : '縮小'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      {/* ナビゲーション */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'nav-item--active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 設定ボタン */}
      <div className="sidebar-footer">
        <button className="nav-item" onClick={onSettingsClick} title={collapsed ? '設定' : undefined}>
          <span className="nav-item-icon">⚙️</span>
          <span className="nav-item-label">設定</span>
        </button>
      </div>
    </aside>
  )
}

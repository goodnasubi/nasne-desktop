import { useEffect, useState } from 'react'

type Props = {
  sectionLabel: string
  sectionSublabel: string
  nasneIps: string[]
  boxNames?: Record<string, string>
  nasneView: string   // 'all' | ip
  onNasneChange: (value: string) => void
  onHome: () => void
  onOpenSettings: () => void
}

export default function TopBar({
  sectionLabel,
  sectionSublabel,
  nasneIps,
  boxNames = {},
  nasneView,
  onNasneChange,
  onHome,
  onOpenSettings,
}: Props) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // タブ: ALL + 各nasne
  const tabs = [
    { value: 'all', label: 'ALL' },
    ...nasneIps.map((ip) => ({ value: ip, label: boxNames[ip] || ip })),
  ]

  return (
    <div className="top-bar">
      <button type="button" className="top-bar-back" onClick={onHome}>
        ← ホーム
      </button>
      <div className="top-bar-section">
        <span className="top-bar-label">{sectionLabel}</span>
        <span className="top-bar-sublabel">{sectionSublabel}</span>
      </div>
      <div className="top-bar-nasne-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`nasne-tab${nasneView === tab.value ? ' nasne-tab--active' : ''}`}
            onClick={() => onNasneChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="top-bar-right">
        <span className="top-bar-clock">
          {now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button className="top-bar-settings" onClick={onOpenSettings} title="設定">
          ⚙
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { NasneAPI } from '../api/nasne'

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000_000)
    return `${(bytes / 1_000_000_000_000).toFixed(1)} TB`
  if (bytes >= 1_000_000_000)
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  if (bytes >= 1_000_000)
    return `${(bytes / 1_000_000).toFixed(0)} MB`
  return `${bytes} B`
}

type StorageDisk = {
  label: string
  totalSize: number
  freeSize: number
  usedSize: number
}

type Props = { nasneIp: string }

function DiskCard({ disk }: { disk: StorageDisk }) {
  const usedPct = disk.totalSize > 0 ? (disk.usedSize / disk.totalSize) * 100 : 0
  const freePct = 100 - usedPct

  // 使用率によって色を変える
  const barColor =
    usedPct >= 90 ? '#ff453a' :
    usedPct >= 75 ? '#ff9f0a' :
    '#30d158'

  return (
    <div className="storage-card">
      <div className="storage-card-header">
        <span className="storage-icon">💾</span>
        <h3 className="storage-label">{disk.label}</h3>
      </div>

      {/* プログレスバー */}
      <div className="storage-bar-track">
        <div
          className="storage-bar-fill"
          style={{ width: `${usedPct.toFixed(1)}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="storage-stats">
        <div className="storage-stat">
          <span className="stat-label">使用中</span>
          <span className="stat-value" style={{ color: barColor }}>
            {formatBytes(disk.usedSize)}
          </span>
        </div>
        <div className="storage-stat">
          <span className="stat-label">空き容量</span>
          <span className="stat-value">{formatBytes(disk.freeSize)}</span>
        </div>
        <div className="storage-stat">
          <span className="stat-label">合計</span>
          <span className="stat-value">{formatBytes(disk.totalSize)}</span>
        </div>
      </div>

      <div className="storage-usage-text">
        使用率 <strong>{usedPct.toFixed(1)}%</strong>
        &nbsp;(空き {freePct.toFixed(1)}%)
      </div>
    </div>
  )
}

export default function StorageInfo({ nasneIp }: Props) {
  const [disks, setDisks] = useState<StorageDisk[]>([])
  const [boxName, setBoxName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [hddRes, nameRes] = await Promise.allSettled([
        NasneAPI.getHDDInfo(nasneIp),
        NasneAPI.getBoxName(nasneIp)
      ])

      if (nameRes.status === 'fulfilled') {
        setBoxName((nameRes.value as { name: string }).name ?? '')
      }

      if (hddRes.status === 'rejected') {
        throw new Error(String(hddRes.reason))
      }

      const hdd = (hddRes.value as { HDD: { internalHDD?: { totalSize: number; freeSize: number }; externalHDD?: { totalSize: number; freeSize: number } } }).HDD
      const result: StorageDisk[] = []

      // 内蔵 HDD
      if (hdd?.internalHDD) {
        const { totalSize, freeSize } = hdd.internalHDD
        result.push({
          label: '内蔵 HDD',
          totalSize,
          freeSize,
          usedSize: totalSize - freeSize
        })
      }

      // 外付け HDD (存在する場合)
      if (hdd?.externalHDD) {
        const { totalSize, freeSize } = hdd.externalHDD
        result.push({
          label: '外付け HDD',
          totalSize,
          freeSize,
          usedSize: totalSize - freeSize
        })
      }

      // API が想定外の構造を返した場合でも表示できるようにフォールバック
      if (result.length === 0 && hdd) {
        // HDD オブジェクトをそのまま解析しようとする
        const raw = hdd as Record<string, unknown>
        Object.entries(raw).forEach(([key, val]) => {
          if (val && typeof val === 'object') {
            const v = val as Record<string, number>
            if (v.totalSize && v.freeSize) {
              result.push({
                label: key,
                totalSize: v.totalSize,
                freeSize: v.freeSize,
                usedSize: v.totalSize - v.freeSize
              })
            }
          }
        })
      }

      setDisks(result)
    } catch (err) {
      setError(`ストレージ情報を取得できませんでした。\n${err}`)
    } finally {
      setLoading(false)
    }
  }, [nasneIp])

  useEffect(() => { fetch() }, [fetch])

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><h2 className="page-title">ストレージ</h2></div>
        <div className="loading-state"><div className="spinner" /><span>読み込み中...</span></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header"><h2 className="page-title">ストレージ</h2></div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
          <button className="btn-secondary" onClick={fetch}>再試行</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">ストレージ</h2>
          {boxName && <p className="page-subtitle">{boxName}</p>}
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={fetch} title="更新">↻</button>
        </div>
      </div>

      {disks.length === 0 ? (
        <div className="empty-state">
          <p>ストレージ情報が取得できませんでした</p>
        </div>
      ) : (
        <div className="storage-grid">
          {disks.map((disk, i) => (
            <DiskCard key={i} disk={disk} />
          ))}
        </div>
      )}

      {/* デバッグ情報 */}
      <div className="storage-device-info">
        <span>デバイス: {nasneIp}</span>
      </div>
    </div>
  )
}

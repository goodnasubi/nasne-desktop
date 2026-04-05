import { useState, useEffect, useCallback } from 'react'
import { NasneAPI } from '../api/nasne'

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000_000) return `${(bytes / 1_000_000_000_000).toFixed(1)} TB`
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`
  return `${bytes} B`
}

type StorageDisk = {
  label: string
  totalSize: number
  freeSize: number
  usedSize: number
  nasneIp: string
  boxName?: string
}

type Props = { nasneIps: string[] }

function DiskCard({ disk }: { disk: StorageDisk }) {
  const usedPct = disk.totalSize > 0 ? (disk.usedSize / disk.totalSize) * 100 : 0
  const freePct = 100 - usedPct

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

      <div className="storage-device-info">
        <span>{disk.boxName ? `${disk.boxName} (${disk.nasneIp})` : disk.nasneIp}</span>
      </div>

      <div className="storage-bar-track">
        <div className="storage-bar-fill" style={{ width: `${usedPct.toFixed(1)}%`, backgroundColor: barColor }} />
      </div>

      <div className="storage-stats">
        <div className="storage-stat">
          <span className="stat-label">使用中</span>
          <span className="stat-value" style={{ color: barColor }}>{formatBytes(disk.usedSize)}</span>
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

export default function StorageInfo({ nasneIps }: Props) {
  const [disks, setDisks] = useState<StorageDisk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (nasneIps.length === 0) {
      setDisks([])
      setError('nasne が未設定です。設定画面からIPアドレスを登録してください。')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const settled = await Promise.allSettled(
        nasneIps.map(async (ip) => {
          const [hddRes, nameRes] = await Promise.allSettled([
            NasneAPI.getHDDInfo(ip),
            NasneAPI.getBoxName(ip)
          ])

          if (hddRes.status === 'rejected') {
            throw new Error(String(hddRes.reason))
          }

          const boxName = nameRes.status === 'fulfilled' ? ((nameRes.value as { name: string }).name ?? '') : ''
          const hdd = (hddRes.value as { HDD: { internalHDD?: { totalSize: number; freeSize: number }; externalHDD?: { totalSize: number; freeSize: number } } }).HDD
          const result: StorageDisk[] = []

          if (hdd?.internalHDD) {
            const { totalSize, freeSize } = hdd.internalHDD
            result.push({
              label: '内蔵 HDD',
              totalSize,
              freeSize,
              usedSize: totalSize - freeSize,
              nasneIp: ip,
              boxName
            })
          }

          if (hdd?.externalHDD) {
            const { totalSize, freeSize } = hdd.externalHDD
            result.push({
              label: '外付け HDD',
              totalSize,
              freeSize,
              usedSize: totalSize - freeSize,
              nasneIp: ip,
              boxName
            })
          }

          if (result.length === 0 && hdd) {
            const raw = hdd as Record<string, unknown>
            Object.entries(raw).forEach(([key, val]) => {
              if (val && typeof val === 'object') {
                const v = val as Record<string, number>
                if (v.totalSize && v.freeSize) {
                  result.push({
                    label: key,
                    totalSize: v.totalSize,
                    freeSize: v.freeSize,
                    usedSize: v.totalSize - v.freeSize,
                    nasneIp: ip,
                    boxName
                  })
                }
              }
            })
          }

          return { ip, disks: result }
        })
      )

      const mergedDisks: StorageDisk[] = []
      const failedIps: string[] = []

      settled.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          mergedDisks.push(...res.value.disks)
        } else {
          failedIps.push(nasneIps[idx] ?? 'unknown')
        }
      })

      setDisks(mergedDisks)
      if (failedIps.length > 0 && mergedDisks.length > 0) {
        setError(`一部nasneで取得に失敗しました: ${failedIps.join(', ')}`)
      } else if (failedIps.length > 0) {
        setError(`ストレージ情報を取得できませんでした: ${failedIps.join(', ')}`)
      }
    } catch (err) {
      setError(`ストレージ情報を取得できませんでした。\n${err}`)
    } finally {
      setLoading(false)
    }
  }, [nasneIps])

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
          <p className="page-subtitle">{nasneIps.length}台を表示中</p>
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
            <DiskCard key={`${disk.nasneIp}:${disk.label}:${i}`} disk={disk} />
          ))}
        </div>
      )}
    </div>
  )
}

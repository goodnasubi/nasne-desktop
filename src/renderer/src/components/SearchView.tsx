import { useState, useEffect } from 'react'
import { NasneAPI } from '../api/nasne'

type ChannelOption = {
  serviceId: string
  name: string
  broadcastingType: number  // 1=地デジ, 2=BS, 3=CS
}

// ─── ユーティリティ ──────────────────────────────────

/** Date input ("YYYY-MM-DDTHH:mm") → "YYYYMMDDHHmmss" */
function inputToNasne(v: string): string {
  return v.replace(/[-T:]/g, '') + '00'
}

/** 今から1時間後を "YYYY-MM-DDTHH:mm" で返す */
function defaultStartTime(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`
}

// ─── メインビュー ────────────────────────────────────

// 録画一覧・予約一覧の両方からチャンネル情報を抽出してユニーク化
async function fetchChannelsFromNasne(ip: string): Promise<ChannelOption[]> {
  const map = new Map<string, { name: string; broadcastingType: number }>()

  const addToMap = (
    serviceId: string | undefined,
    chName: string | undefined,
    broadcastingType: number | undefined
  ) => {
    if (serviceId && !map.has(serviceId)) {
      map.set(serviceId, {
        name: chName ?? serviceId,
        broadcastingType: broadcastingType ?? 1
      })
    }
  }

  // 録画一覧と予約一覧を並列取得
  const [recordings, reservations] = await Promise.allSettled([
    NasneAPI.getRecordingList(ip, 0, 0),
    NasneAPI.getReservationList(ip)
  ])

  if (recordings.status === 'fulfilled') {
    for (const t of recordings.value.item) {
      addToMap(t.serviceId, t.chName, undefined)
    }
  }
  if (reservations.status === 'fulfilled') {
    for (const r of reservations.value.item) {
      addToMap(r.serviceId, r.chName, r.broadcastingType)
    }
  }

  return Array.from(map.entries())
    .map(([serviceId, v]) => ({ serviceId, name: v.name, broadcastingType: v.broadcastingType }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

type Props = { nasneIp: string }

type FormState = {
  title: string
  serviceId: string
  broadcastingType: string  // 1=地デジ, 2=BS, 3=CS
  startDateTime: string     // "YYYY-MM-DDTHH:mm"
  durationMin: string       // 分
  quality: string           // 100=DR, 101=3倍, 102=5倍
  storageId: string         // 0=内蔵, 1=外付け
}

const INITIAL_FORM: FormState = {
  title: '',
  serviceId: '',
  broadcastingType: '1',
  startDateTime: defaultStartTime(),
  durationMin: '30',
  quality: '100',
  storageId: '0'
}

export default function SearchView({ nasneIp }: Props) {
  const [services, setServices]       = useState<ChannelOption[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [servicesError, setServicesError]     = useState('')
  const [form, setForm]               = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors]           = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting]   = useState(false)
  const [success, setSuccess]         = useState(false)
  const [submitError, setSubmitError] = useState('')

  // 録画・予約一覧からチャンネルを抽出
  useEffect(() => {
    setServicesLoading(true)
    fetchChannelsFromNasne(nasneIp)
      .then((list) => {
        setServices(list)
        if (list.length > 0) {
          setForm((f) => ({
            ...f,
            serviceId: list[0].serviceId,
            broadcastingType: String(list[0].broadcastingType)
          }))
        }
      })
      .catch(() => {/* エラーでも手入力できるので無視 */})
      .finally(() => setServicesLoading(false))
  }, [nasneIp])

  const set = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((er) => ({ ...er, [key]: undefined }))
    setSuccess(false)
    setSubmitError('')
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.title.trim())       e.title = '番組名を入力してください'
    if (!form.serviceId)          e.serviceId = 'チャンネルを選択してください'
    if (!form.startDateTime)      e.startDateTime = '開始日時を指定してください'
    const dur = Number(form.durationMin)
    if (!dur || dur <= 0)         e.durationMin = '1以上の整数を入力してください'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await NasneAPI.createReservation(nasneIp, {
        title:            form.title.trim(),
        startDateTime:    inputToNasne(form.startDateTime),
        duration:         Number(form.durationMin) * 60,
        broadcastingType: Number(form.broadcastingType),
        serviceId:        form.serviceId,
        quality:          Number(form.quality),
        storageId:        Number(form.storageId)
      })
      setSuccess(true)
      setForm({
        ...INITIAL_FORM,
        startDateTime: defaultStartTime(),
        serviceId: form.serviceId,
        broadcastingType: form.broadcastingType
      })
    } catch (err) {
      setSubmitError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">録画予約を追加</h2>
          <p className="page-subtitle">チャンネル・日時・録画時間を指定して予約</p>
        </div>
      </div>

      <div className="reserve-form-wrap">
        <form className="reserve-form-card" onSubmit={handleSubmit} noValidate>

          {/* 番組名 */}
          <div className="field-group">
            <label className="field-label" htmlFor="r-title">番組名</label>
            <input
              id="r-title"
              type="text"
              className={`field-input ${errors.title ? 'field-input--error' : ''}`}
              placeholder="例: ニュース7"
              value={form.title}
              onChange={set('title')}
            />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </div>

          {/* 放送種別 + チャンネル */}
          <div className="form-row">
            <div className="field-group">
              <label className="field-label" htmlFor="r-btype">放送種別</label>
              <select
                id="r-btype"
                className="field-select"
                value={form.broadcastingType}
                onChange={set('broadcastingType')}
              >
                <option value="1">地上デジタル</option>
                <option value="2">BS デジタル</option>
                <option value="3">CS デジタル</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="r-service">チャンネル (serviceId)</label>
              {servicesLoading ? (
                <div className="field-loading">取得中…</div>
              ) : services.length > 0 ? (
                <select
                  id="r-service"
                  className={`field-select ${errors.serviceId ? 'field-input--error' : ''}`}
                  value={form.serviceId}
                  onChange={(e) => {
                    const selected = services.find(s => s.serviceId === e.target.value)
                    setForm((f) => ({
                      ...f,
                      serviceId: e.target.value === '__manual__' ? '' : e.target.value,
                      broadcastingType: selected ? String(selected.broadcastingType) : f.broadcastingType
                    }))
                    setErrors((er) => ({ ...er, serviceId: undefined }))
                  }}
                >
                  <option value="">選択してください</option>
                  {services.map((s) => (
                    <option key={s.serviceId} value={s.serviceId}>
                      {s.name}
                    </option>
                  ))}
                  <option value="__manual__">手入力する…</option>
                </select>
              ) : (
                <input
                  id="r-service"
                  type="text"
                  className={`field-input ${errors.serviceId ? 'field-input--error' : ''}`}
                  placeholder="例: 1024"
                  value={form.serviceId}
                  onChange={set('serviceId')}
                />
              )}
              {/* 「手入力する…」を選んだ場合 */}
              {form.serviceId === '' && services.length > 0 && !servicesLoading && (
                <input
                  type="text"
                  className="field-input"
                  placeholder="serviceId を入力 (例: 1024)"
                  onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
                  autoFocus
                />
              )}
              {errors.serviceId && <span className="field-error">{errors.serviceId}</span>}
            </div>
          </div>

          {/* 開始日時 + 録画時間 */}
          <div className="form-row">
            <div className="field-group">
              <label className="field-label" htmlFor="r-start">開始日時</label>
              <input
                id="r-start"
                type="datetime-local"
                className={`field-input ${errors.startDateTime ? 'field-input--error' : ''}`}
                value={form.startDateTime}
                onChange={set('startDateTime')}
              />
              {errors.startDateTime && <span className="field-error">{errors.startDateTime}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="r-dur">録画時間（分）</label>
              <input
                id="r-dur"
                type="number"
                min="1"
                max="360"
                className={`field-input ${errors.durationMin ? 'field-input--error' : ''}`}
                value={form.durationMin}
                onChange={set('durationMin')}
              />
              {errors.durationMin && <span className="field-error">{errors.durationMin}</span>}
            </div>
          </div>

          {/* 録画設定 */}
          <div className="form-row">
            <div className="field-group">
              <label className="field-label" htmlFor="r-quality">録画画質</label>
              <select
                id="r-quality"
                className="field-select"
                value={form.quality}
                onChange={set('quality')}
              >
                <option value="100">DR（最高画質）</option>
                <option value="101">3倍録画</option>
                <option value="102">5倍録画</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="r-storage">保存先</label>
              <select
                id="r-storage"
                className="field-select"
                value={form.storageId}
                onChange={set('storageId')}
              >
                <option value="0">内蔵HDD</option>
                <option value="1">外付けHDD</option>
              </select>
            </div>
          </div>

          {/* エラー / 成功 */}
          {submitError && (
            <div className="error-banner">❌ {submitError}</div>
          )}
          {success && (
            <div className="success-banner">✅ 予約しました</div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            className="btn-primary btn-full"
            disabled={submitting}
          >
            {submitting ? '予約中…' : '📅 予約する'}
          </button>
        </form>

        {/* ヒント */}
        <div className="reserve-hint-card">
          <div className="reserve-hint-title">💡 ヒント</div>
          <ul className="info-list">
            <li>チャンネルは nasne に登録されているサービス一覧から選択できます</li>
            <li>予約後は「録画予約」タブで確認・削除できます</li>
            <li>録画時間に余裕を持たせるため、前後1〜2分の追加をおすすめします</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

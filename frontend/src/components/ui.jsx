import { useEffect } from 'react'
import { ORDER_STATUS } from '../lib/format'

export function Spinner({ className = '' }) {
  return (
    <div className={`flex justify-center py-10 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  )
}

export function Empty({ title = 'Belum ada data', children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
      <div className="mb-3 text-5xl">🛍️</div>
      <p className="font-medium">{title}</p>
      {children}
    </div>
  )
}

export function ErrorBox({ message }) {
  return message ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div> : null
}

export function Stars({ value = 0, size = 'text-xs' }) {
  return (
    <span className={`${size} text-yellow-400`} aria-label={`Rating ${value}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? '' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </span>
  )
}

export function StatusBadge({ status }) {
  const s = ORDER_STATUS[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
}

export function Badge({ children, color = 'bg-gray-100 text-gray-700' }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>{children}</span>
}

export function Pagination({ data, onPage }) {
  const current = data?.meta?.current_page ?? data?.current_page
  const last = data?.meta?.last_page ?? data?.last_page
  if (!last || last <= 1) return null
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <button className="btn-ghost" disabled={current <= 1} onClick={() => onPage(current - 1)}>
        ‹
      </button>
      <span className="text-sm text-gray-600">
        {current} / {last}
      </span>
      <button className="btn-ghost" disabled={current >= last} onClick={() => onPage(current + 1)}>
        ›
      </button>
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600" aria-label="Tutup">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, error, children }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex overflow-x-auto border-b bg-white">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`shrink-0 border-b-2 px-4 py-3 text-sm ${value === t.value ? 'border-brand text-brand' : 'border-transparent text-gray-600 hover:text-brand'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function BarChart({ data, valueKey = 'total', labelKey = 'date', format = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]))
  return (
    <div className="flex h-48 items-end gap-1">
      {data.map((d) => (
        <div key={d[labelKey]} className="group relative flex h-full flex-1 flex-col justify-end">
          <div className="rounded-t bg-brand/80 transition group-hover:bg-brand" style={{ height: `${(d[valueKey] / max) * 100}%`, minHeight: 2 }} />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
            {d[labelKey]}: {format(d[valueKey])}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatCard({ label, value, icon }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-2xl">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  )
}

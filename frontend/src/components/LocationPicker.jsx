import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function LocationPicker({ value, onChange, placeholder = 'Cari kecamatan / kota (min. 3 huruf)' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (query.trim().length < 3) return
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/locations', { params: { search: query.trim() } })
        setResults(data)
        setOpen(true)
      } catch {
        setResults([])
      }
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="relative">
      {value?.label && (
        <div className="mb-2 flex items-center justify-between rounded bg-brand-light px-3 py-2 text-sm">
          <span>📍 {value.label}</span>
          <button type="button" className="text-xs text-brand" onClick={() => onChange(null)}>
            Ubah
          </button>
        </div>
      )}
      {!value?.label && (
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
      )}
      {open && !value?.label && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded border bg-white shadow-lg">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-brand-light"
                onClick={() => {
                  onChange(r)
                  setOpen(false)
                  setQuery('')
                }}
              >
                {r.label} {r.postal_code && <span className="text-gray-400">({r.postal_code})</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

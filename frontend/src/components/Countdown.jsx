import { useEffect, useState } from 'react'

export default function Countdown({ to, onEnd }) {
  const [now, setNow] = useState(() => Date.now())
  const target = new Date(to).getTime()

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = Math.max(0, Math.floor((target - now) / 1000))
  useEffect(() => {
    if (diff === 0 && onEnd) onEnd()
  }, [diff, onEnd])

  const parts = [Math.floor(diff / 3600), Math.floor((diff % 3600) / 60), diff % 60].map((n) => String(n).padStart(2, '0'))
  return (
    <span className="inline-flex gap-1">
      {parts.map((p, i) => (
        <span key={i} className="rounded bg-gray-900 px-1.5 py-0.5 font-mono text-sm font-bold text-white">
          {p}
        </span>
      ))}
    </span>
  )
}

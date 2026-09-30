import { useEffect, useState } from 'react'
import { Empty, Pagination, Spinner } from '../../components/ui'
import api from '../../lib/api'
import { dateTime } from '../../lib/format'
import useFetch from '../../lib/useFetch'

const ICONS = { order: '📦', payment: '💳', shop: '🏪', product: '🛍️', finance: '💰', promo: '🎉' }

export default function Notifications() {
  const [page, setPage] = useState(1)
  const { data, loading, reload } = useFetch('/notifications', { page })

  useEffect(() => {
    if (data?.unread_count > 0) api.post('/notifications/read-all').catch(() => {})
  }, [data?.unread_count])

  if (loading && !data) return <Spinner />
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h1 className="text-lg">🔔 Notifikasi</h1>
        <button onClick={reload} className="text-sm text-brand">Muat ulang</button>
      </div>
      {!data?.data?.length ? (
        <Empty title="Belum ada notifikasi" />
      ) : (
        data.data.map((n) => (
          <div key={n.id} className={`flex gap-4 border-b px-5 py-4 text-sm ${!n.read_at ? 'bg-brand-light/60' : ''}`}>
            <span className="text-2xl">{ICONS[n.type] || '🔔'}</span>
            <div>
              <p className="font-medium">{n.title}</p>
              <p className="text-gray-600">{n.body}</p>
              <p className="mt-1 text-xs text-gray-400">{dateTime(n.created_at)}</p>
            </div>
          </div>
        ))
      )}
      <div className="pb-4"><Pagination data={data} onPage={setPage} /></div>
    </div>
  )
}

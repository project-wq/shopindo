import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, Pagination, Spinner, StatusBadge, Tabs } from '../../components/ui'
import { rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

const TABS = [
  { value: '', label: 'Semua' },
  { value: 'pending_payment', label: 'Belum Bayar' },
  { value: 'paid', label: 'Dikemas' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

export default function Orders() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading } = useFetch('/orders', { status: status || undefined, page })

  return (
    <div className="space-y-3">
      <Tabs tabs={TABS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
      {loading ? (
        <Spinner />
      ) : !data?.data?.length ? (
        <Empty title="Belum ada pesanan" />
      ) : (
        data.data.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="card block hover:shadow-md">
            <div className="flex items-center justify-between border-b px-5 py-3 text-sm">
              <span className="font-medium">🏪 {o.shop?.name}</span>
              <span className="flex items-center gap-3 text-xs text-gray-500">
                {o.order_number} <StatusBadge status={o.status} />
              </span>
            </div>
            {o.items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 border-b px-5 py-3 text-sm">
                <img src={i.image} alt="" className="h-16 w-16 object-cover" />
                <div className="flex-1">
                  <p className="line-clamp-1">{i.product_name}</p>
                  {i.variant_name && <p className="text-xs text-gray-500">Variasi: {i.variant_name}</p>}
                  <p className="text-xs">x{i.quantity}</p>
                </div>
                <span className="text-brand">{rupiah(i.price)}</span>
              </div>
            ))}
            <div className="flex justify-end gap-2 px-5 py-3 text-sm">
              Total Pesanan: <span className="text-lg text-brand">{rupiah(o.total)}</span>
            </div>
          </Link>
        ))
      )}
      <Pagination data={data} onPage={setPage} />
    </div>
  )
}

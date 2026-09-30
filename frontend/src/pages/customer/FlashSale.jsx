import { useState } from 'react'
import { Link } from 'react-router-dom'
import Countdown from '../../components/Countdown'
import { Empty, Spinner } from '../../components/ui'
import { rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function FlashSale() {
  const { data, loading, reload } = useFetch('/flash-sales')
  const [active, setActive] = useState(0)

  if (loading) return <Spinner />
  if (!data?.length) return <Empty title="Belum ada flash sale" />
  const session = data[active] || data[0]

  return (
    <div className="space-y-4">
      <div className="flex overflow-x-auto bg-gray-800 text-white">
        {data.map((s, i) => (
          <button key={s.id} onClick={() => setActive(i)} className={`min-w-40 px-6 py-3 text-center ${i === active ? 'bg-brand' : ''}`}>
            <p className="text-lg font-bold">{new Date(s.starts_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-xs">{s.is_running ? 'Sedang Berlangsung' : 'Akan Datang'}</p>
          </button>
        ))}
      </div>
      <div className="card flex items-center justify-between px-5 py-3">
        <h1 className="text-xl font-bold text-brand italic">⚡ {session.name}</h1>
        <span className="flex items-center gap-2 text-sm">
          {session.is_running ? 'Berakhir dalam' : 'Dimulai dalam'} <Countdown to={session.is_running ? session.ends_at : session.starts_at} onEnd={reload} />
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {session.items.map((item) => (
          <div key={item.id} className="card flex gap-4 p-3">
            <img src={item.product.image} alt={item.product.name} className="h-32 w-32 rounded object-cover" />
            <div className="flex flex-1 flex-col">
              <p className="line-clamp-2 text-sm">{item.product.name}</p>
              <p className="mt-2 text-xl font-medium text-brand">{rupiah(item.flash_price)}</p>
              <p className="text-xs text-gray-400 line-through">{rupiah(item.product.min_price)}</p>
              <div className="mt-auto flex items-center gap-3">
                <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-orange-200">
                  <div className="h-full bg-brand" style={{ width: `${Math.min(100, (item.sold / item.stock) * 100)}%` }} />
                  <span className="absolute inset-0 text-center text-[10px] leading-4 text-white">{item.sold >= item.stock ? 'HABIS' : `${item.sold} terjual`}</span>
                </div>
                {session.is_running && item.sold < item.stock ? (
                  <Link to={`/product/${item.product.slug}`} className="btn-primary py-1">Beli</Link>
                ) : (
                  <span className="btn-ghost py-1">{item.sold >= item.stock ? 'Habis' : 'Segera'}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

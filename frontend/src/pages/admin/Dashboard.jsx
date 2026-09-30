import { Link } from 'react-router-dom'
import { BarChart, Spinner, StatCard, StatusBadge } from '../../components/ui'
import { rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function Dashboard() {
  const { data, loading } = useFetch('/admin/dashboard')
  if (loading || !data) return <Spinner />
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Dashboard Platform</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon="💵" label="GMV (total transaksi dibayar)" value={rupiah(data.gmv)} />
        <StatCard icon="🏦" label="Pendapatan komisi" value={rupiah(data.commission)} />
        <StatCard icon="👥" label="Pembeli" value={data.users} />
        <StatCard icon="🏪" label="Seller / toko aktif" value={`${data.sellers} / ${data.shops_active}`} />
        <StatCard icon="🛍️" label="Total produk" value={data.products} />
        <StatCard icon="📦" label="Pesanan hari ini" value={data.orders_today} />
        <Link to="/admin/shops?status=pending"><StatCard icon="⏳" label="Toko menunggu verifikasi" value={data.shops_pending} /></Link>
        <Link to="/admin/withdrawals?status=pending"><StatCard icon="💸" label="Penarikan menunggu" value={data.withdrawals_pending} /></Link>
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-medium">GMV 30 Hari Terakhir</h2>
        <BarChart data={data.gmv_chart} format={rupiah} />
      </div>
      <div className="card p-5">
        <h2 className="mb-3 font-medium">Status Pesanan</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(data.order_status).map(([s, n]) => (
            <span key={s} className="flex items-center gap-2 text-sm"><StatusBadge status={s} /> {n}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

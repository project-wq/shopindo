import { Link } from 'react-router-dom'
import { BarChart, Spinner, StatCard } from '../../components/ui'
import { rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function Dashboard() {
  const { data, loading } = useFetch('/seller/dashboard')
  if (loading || !data) return <Spinner />
  const sc = data.status_counts || {}
  const todo = [
    ['Perlu Dikemas', sc.paid || 0, 'paid'],
    ['Diproses', sc.processing || 0, 'processing'],
    ['Dikirim', sc.shipped || 0, 'shipped'],
    ['Selesai', sc.completed || 0, 'completed'],
    ['Dibatalkan', sc.cancelled || 0, 'cancelled'],
  ]
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Dashboard Toko</h1>
      <div className="card p-5">
        <h2 className="mb-4 font-medium">Yang Perlu Dilakukan</h2>
        <div className="grid grid-cols-5 divide-x text-center">
          {todo.map(([label, n, s]) => (
            <Link key={s} to={`/seller/orders?status=${s}`} className="px-2 hover:text-brand">
              <p className="text-2xl font-semibold text-blue-600">{n}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon="💰" label="Saldo Penjual" value={rupiah(data.balance)} />
        <StatCard icon="📈" label="Total Penjualan" value={rupiah(data.total_revenue)} />
        <StatCard icon="🛍️" label="Total Produk" value={data.total_products} />
        <StatCard icon="⭐" label={`Rating · ${data.followers} pengikut`} value={Number(data.rating_avg).toFixed(1)} />
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-medium">Penjualan 30 Hari Terakhir</h2>
        <BarChart data={data.sales_chart} format={rupiah} />
      </div>
      <div className="card p-5">
        <h2 className="mb-3 font-medium">Produk Terlaris</h2>
        <table className="table">
          <thead><tr><th>Produk</th><th>Harga</th><th>Stok</th><th>Terjual</th></tr></thead>
          <tbody>
            {data.top_products.map((p) => (
              <tr key={p.id}><td>{p.name}</td><td>{rupiah(p.price)}</td><td>{p.stock}</td><td>{p.sold_count}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

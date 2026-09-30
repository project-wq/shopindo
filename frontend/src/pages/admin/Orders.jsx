import { useState } from 'react'
import { Empty, Modal, Pagination, Spinner, StatusBadge, Tabs } from '../../components/ui'
import api from '../../lib/api'
import { ORDER_STATUS, dateTime, rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function Orders() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading } = useFetch('/admin/orders', { status: status || undefined, q: q || undefined, page })
  const [detail, setDetail] = useState(null)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Semua Pesanan</h1>
      <Tabs tabs={[{ value: '', label: 'Semua' }, ...Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: s.label }))]} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
      <input className="input max-w-sm" placeholder="Cari no. pesanan" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : !data?.data?.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>No. Pesanan</th><th>Pembeli</th><th>Toko</th><th>Total</th><th>Komisi</th><th>Pembayaran</th><th>Status</th><th>Tanggal</th></tr></thead>
            <tbody>
              {data.data.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-gray-50" onClick={() => api.get(`/admin/orders/${o.id}`).then((r) => setDetail(r.data))}>
                  <td className="text-blue-600">{o.order_number}</td>
                  <td>{o.user?.name}</td>
                  <td>{o.shop?.name}</td>
                  <td>{rupiah(o.total)}</td>
                  <td>{rupiah(o.commission)}</td>
                  <td className="text-xs">{o.payment?.gateway} · {o.payment?.status}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-xs">{dateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination data={data} onPage={setPage} />
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.order_number} wide>
        {detail && (
          <div className="space-y-3 text-sm">
            <p>Pembeli: {detail.user?.name} ({detail.user?.email}) · Toko: {detail.shop?.name}</p>
            <p>Kurir: {detail.courier_name} {detail.courier_service} · Resi: {detail.tracking_number || '-'}</p>
            <p>Pembayaran: {detail.payment?.code} · {detail.payment?.gateway} / {detail.payment?.method || '-'} · {detail.payment?.status}</p>
            <table className="table">
              <thead><tr><th>Produk</th><th>Harga</th><th>Qty</th><th>Subtotal</th></tr></thead>
              <tbody>
                {detail.items.map((i) => (
                  <tr key={i.id}><td>{i.product_name} {i.variant_name && `(${i.variant_name})`}</td><td>{rupiah(i.price)}</td><td>{i.quantity}</td><td>{rupiah(i.subtotal)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="text-right">Ongkir {rupiah(detail.shipping_cost)} · Diskon {rupiah(detail.shop_discount + detail.platform_discount + detail.shipping_discount)} · <b>Total {rupiah(detail.total)}</b></p>
          </div>
        )}
      </Modal>
    </div>
  )
}

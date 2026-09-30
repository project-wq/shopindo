import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Empty, Modal, Pagination, Spinner, StatusBadge, Tabs } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateTime, rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

const TABS = [
  { value: '', label: 'Semua' },
  { value: 'paid', label: 'Perlu Dikemas' },
  { value: 'processing', label: 'Diproses' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

export default function Orders() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const { data, loading, reload } = useFetch('/seller/orders', { status: status || undefined, q: q || undefined, page })
  const [detail, setDetail] = useState(null)
  const [shipOrder, setShipOrder] = useState(null)
  const [resi, setResi] = useState('')

  const act = async (fn, msg) => {
    try {
      await fn()
      toast(msg)
      reload()
      return true
    } catch (e) {
      toast(errorMessage(e), 'error')
      return false
    }
  }

  const openDetail = async (o) => {
    const { data: d } = await api.get(`/seller/orders/${o.id}`)
    setDetail(d)
  }

  const cancel = (o) => {
    const reason = window.prompt('Alasan pembatalan (mis. stok habis):')
    if (reason) act(() => api.post(`/seller/orders/${o.id}/cancel`, { reason }), 'Pesanan dibatalkan')
  }

  const ship = async (e) => {
    e.preventDefault()
    if (await act(() => api.post(`/seller/orders/${shipOrder.id}/ship`, { tracking_number: resi.trim() }), 'Pesanan dikirim')) {
      setShipOrder(null)
      setResi('')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pesanan Saya</h1>
      <Tabs tabs={TABS} value={status} onChange={(v) => { setParams(v ? { status: v } : {}); setPage(1) }} />
      <input className="input max-w-sm" placeholder="Cari no. pesanan" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
      {loading ? <Spinner /> : !data?.data?.length ? <Empty title="Belum ada pesanan" /> : (
        <div className="space-y-3">
          {data.data.map((o) => (
            <div key={o.id} className="card">
              <div className="flex items-center justify-between border-b px-5 py-3 text-sm">
                <span>👤 {o.user?.name} · <span className="text-gray-500">{o.order_number}</span></span>
                <span className="flex items-center gap-2 text-xs text-gray-500">{dateTime(o.created_at)} <StatusBadge status={o.status} /></span>
              </div>
              <div className="grid gap-4 px-5 py-3 text-sm md:grid-cols-[1fr_160px_200px]">
                <div className="space-y-2">
                  {o.items.map((i) => (
                    <div key={i.id} className="flex items-center gap-3">
                      <img src={i.image} alt="" className="h-12 w-12 object-cover" />
                      <div>
                        <p className="line-clamp-1">{i.product_name}</p>
                        <p className="text-xs text-gray-500">{i.variant_name} x{i.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-brand">{rupiah(o.total)}</p>
                  <p className="text-xs text-gray-500">{o.courier_name} {o.courier_service}</p>
                  {o.tracking_number && <p className="text-xs">Resi: {o.tracking_number}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  {o.status === 'paid' && <button className="btn-primary py-1" onClick={() => act(() => api.post(`/seller/orders/${o.id}/process`), 'Pesanan diproses')}>Proses Pesanan</button>}
                  {['paid', 'processing'].includes(o.status) && <button className="btn-primary py-1" onClick={() => setShipOrder(o)}>Atur Pengiriman</button>}
                  {['paid', 'processing'].includes(o.status) && <button className="btn-ghost py-1" onClick={() => cancel(o)}>Batalkan</button>}
                  <button className="btn-ghost py-1" onClick={() => openDetail(o)}>Rincian</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination data={data} onPage={setPage} />

      <Modal open={!!shipOrder} onClose={() => setShipOrder(null)} title="Atur Pengiriman">
        <form onSubmit={ship} className="space-y-3 text-sm">
          <p>Kurir: <b>{shipOrder?.courier_name} {shipOrder?.courier_service}</b></p>
          <p className="text-gray-500">Serahkan paket ke kurir, lalu masukkan nomor resi. Status akan dilacak otomatis via RajaOngkir.</p>
          <input className="input" required minLength={6} maxLength={40} pattern="[A-Za-z0-9]+" placeholder="Nomor resi" value={resi} onChange={(e) => setResi(e.target.value)} />
          <button className="btn-primary w-full">Konfirmasi Pengiriman</button>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Rincian ${detail?.order_number || ''}`} wide>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="rounded bg-gray-50 p-3">
              <p className="font-medium">Alamat pengiriman</p>
              <p>{detail.shipping_address?.recipient_name} ({detail.shipping_address?.phone})</p>
              <p>{detail.shipping_address?.address_line}, {detail.shipping_address?.destination_label} {detail.shipping_address?.postal_code}</p>
              {detail.note && <p className="mt-2">📝 Catatan pembeli: {detail.note}</p>}
            </div>
            <dl className="space-y-1">
              <div className="flex justify-between"><dt>Subtotal produk</dt><dd>{rupiah(detail.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Voucher toko</dt><dd>-{rupiah(detail.shop_discount)}</dd></div>
              <div className="flex justify-between"><dt>Ongkos kirim</dt><dd>{rupiah(detail.shipping_cost)}</dd></div>
              <div className="flex justify-between"><dt>Biaya layanan (komisi)</dt><dd>-{rupiah(detail.commission)}</dd></div>
              <div className="flex justify-between border-t pt-2 font-semibold"><dt>Penghasilan Anda</dt><dd className="text-brand">{rupiah(detail.seller_income)}</dd></div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Empty, Modal, Spinner, StatusBadge } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateTime, rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function OrderDetail() {
  const { id } = useParams()
  const toast = useToast()
  const { data: order, loading, reload } = useFetch(`/orders/${id}`)
  const [tracking, setTracking] = useState(null)
  const [reviewItem, setReviewItem] = useState(null)
  const [review, setReview] = useState({ rating: 5, comment: '' })

  if (loading && !order) return <Spinner />
  if (!order) return <Empty title="Pesanan tidak ditemukan" />

  const act = async (fn, msg) => {
    try {
      await fn()
      toast(msg)
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const track = async () => {
    try {
      const { data } = await api.get(`/orders/${id}/track`)
      setTracking(data)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const cancel = () => {
    const reason = window.prompt('Alasan pembatalan:')
    if (reason) act(() => api.post(`/orders/${id}/cancel`, { reason }), 'Pesanan dibatalkan')
  }

  const submitReview = async (e) => {
    e.preventDefault()
    await act(() => api.post(`/orders/${id}/review`, { order_item_id: reviewItem.id, ...review }), 'Terima kasih atas ulasannya!')
    setReviewItem(null)
    setReview({ rating: 5, comment: '' })
  }

  const addr = order.shipping_address || {}
  const timeline = [
    ['Pesanan Dibuat', order.created_at],
    ['Pesanan Dibayar', order.paid_at],
    ['Dikirim', order.shipped_at],
    ['Pesanan Diterima', order.delivered_at],
    ['Selesai', order.completed_at],
  ]

  return (
    <div className="space-y-3">
      <div className="card flex items-center justify-between px-5 py-4">
        <Link to="/orders" className="text-sm text-gray-500">‹ Kembali</Link>
        <span className="flex items-center gap-3 text-sm">No. Pesanan {order.order_number} <StatusBadge status={order.status} /></span>
      </div>

      {order.status !== 'cancelled' ? (
        <div className="card grid grid-cols-5 gap-2 px-5 py-6 text-center text-xs">
          {timeline.map(([label, at]) => (
            <div key={label}>
              <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border-4 ${at ? 'border-green-500 text-green-500' : 'border-gray-200 text-gray-300'}`}>✓</div>
              <p>{label}</p>
              <p className="text-gray-400">{at ? dateTime(at) : ''}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-5 text-sm text-gray-600">Dibatalkan: {order.cancel_reason} ({dateTime(order.cancelled_at)})</div>
      )}

      <div className="card grid gap-6 p-5 text-sm md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-lg">Alamat Pengiriman</h3>
          <p className="font-medium">{addr.recipient_name}</p>
          <p className="text-gray-500">{addr.phone}</p>
          <p className="text-gray-500">{addr.address_line}, {addr.destination_label} {addr.postal_code}</p>
        </div>
        <div>
          <h3 className="mb-2 text-lg">Pengiriman</h3>
          <p>{order.courier_name} {order.courier_service} {order.etd && `(${order.etd} hari)`}</p>
          <p>No. Resi: <b>{order.tracking_number || '-'}</b></p>
          {order.tracking_number && <button onClick={track} className="btn-outline mt-2 py-1">Lacak Paket</button>}
          {tracking && (
            <ol className="mt-3 space-y-2 border-l-2 border-green-500 pl-4">
              {tracking.history?.map((h, i) => (
                <li key={i}>
                  <p className="text-xs text-gray-400">{h.date} · {h.city}</p>
                  <p>{h.description}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="card">
        <div className="border-b px-5 py-3 font-medium">🏪 {order.shop?.name}</div>
        {order.items.map((i) => (
          <div key={i.id} className="flex items-center gap-3 border-b px-5 py-3 text-sm">
            <img src={i.image} alt="" className="h-16 w-16 object-cover" />
            <div className="flex-1">
              <p>{i.product_name}</p>
              {i.variant_name && <p className="text-xs text-gray-500">Variasi: {i.variant_name}</p>}
              <p className="text-xs">x{i.quantity}</p>
            </div>
            <div className="text-right">
              {i.original_price > i.price && <p className="text-xs text-gray-400 line-through">{rupiah(i.original_price)}</p>}
              <p className="text-brand">{rupiah(i.price)}</p>
              {order.status === 'completed' && !i.is_reviewed && (
                <button onClick={() => setReviewItem(i)} className="btn-primary mt-1 py-1 text-xs">Nilai</button>
              )}
              {i.review && <p className="text-xs text-yellow-500">{'★'.repeat(i.review.rating)}</p>}
            </div>
          </div>
        ))}
        <dl className="ml-auto max-w-sm space-y-1 p-5 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupiah(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Ongkir</dt><dd>{rupiah(order.shipping_cost)}</dd></div>
          {order.shipping_discount > 0 && <div className="flex justify-between"><dt>Diskon ongkir</dt><dd>-{rupiah(order.shipping_discount)}</dd></div>}
          {order.shop_discount > 0 && <div className="flex justify-between"><dt>Voucher toko</dt><dd>-{rupiah(order.shop_discount)}</dd></div>}
          {order.platform_discount > 0 && <div className="flex justify-between"><dt>Voucher ShopIndo</dt><dd>-{rupiah(order.platform_discount)}</dd></div>}
          <div className="flex justify-between border-t pt-2"><dt>Total</dt><dd className="text-xl text-brand">{rupiah(order.total)}</dd></div>
        </dl>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          {order.status === 'pending_payment' && order.payment && (
            <Link to={`/payment/${order.payment.code}`} className="btn-primary">Bayar Sekarang</Link>
          )}
          {['pending_payment', 'paid'].includes(order.status) && <button onClick={cancel} className="btn-ghost">Batalkan Pesanan</button>}
          {['shipped', 'delivered'].includes(order.status) && (
            <button onClick={() => act(() => api.post(`/orders/${id}/complete`), 'Pesanan selesai')} className="btn-primary">Pesanan Diterima</button>
          )}
        </div>
      </div>

      <Modal open={!!reviewItem} onClose={() => setReviewItem(null)} title="Nilai Produk">
        <form onSubmit={submitReview} className="space-y-4">
          <p className="text-sm">{reviewItem?.product_name}</p>
          <div className="flex gap-1 text-3xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setReview({ ...review, rating: n })} className={n <= review.rating ? 'text-yellow-400' : 'text-gray-300'}>★</button>
            ))}
          </div>
          <textarea className="input" rows={4} maxLength={1000} placeholder="Bagikan pengalaman Anda" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} />
          <button className="btn-primary w-full">Kirim</button>
        </form>
      </Modal>
    </div>
  )
}

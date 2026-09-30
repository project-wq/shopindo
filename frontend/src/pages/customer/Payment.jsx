import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Countdown from '../../components/Countdown'
import { Empty, Spinner } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

function loadSnap(clientKey, production) {
  return new Promise((resolve, reject) => {
    if (window.snap) return resolve(window.snap)
    const script = document.createElement('script')
    script.src = production ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', clientKey)
    script.onload = () => resolve(window.snap)
    script.onerror = reject
    document.body.appendChild(script)
  })
}

export default function Payment() {
  const { code } = useParams()
  const toast = useToast()
  const { data: payment, loading, reload } = useFetch(`/payments/${code}`)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (payment?.status !== 'pending') return
    const t = setInterval(reload, 10000)
    return () => clearInterval(t)
  }, [payment?.status, reload])

  if (loading && !payment) return <Spinner />
  if (!payment) return <Empty title="Pembayaran tidak ditemukan" />

  const payMidtrans = async () => {
    try {
      const snap = await loadSnap(payment.midtrans_client_key, payment.midtrans_is_production)
      snap.pay(payment.snap_token, {
        onSuccess: reload,
        onPending: reload,
        onError: () => toast('Pembayaran gagal', 'error'),
        onClose: reload,
      })
    } catch {
      toast('Gagal memuat Midtrans Snap', 'error')
    }
  }

  const simulate = async () => {
    setBusy(true)
    try {
      await api.post(`/payments/${code}/simulate`)
      toast('Pembayaran berhasil!')
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      {payment.status === 'paid' ? (
        <>
          <p className="text-6xl">✅</p>
          <h1 className="mt-4 text-2xl font-semibold text-green-600">Pembayaran Berhasil</h1>
          <p className="mt-2 text-gray-600">Pesanan Anda sedang diteruskan ke penjual.</p>
        </>
      ) : payment.status === 'pending' ? (
        <>
          <p className="text-sm text-gray-500">Selesaikan pembayaran dalam</p>
          <div className="my-2"><Countdown to={payment.expires_at} onEnd={reload} /></div>
          <p className="text-sm text-gray-500">Total Pembayaran</p>
          <p className="text-3xl font-semibold text-brand">{rupiah(payment.amount)}</p>
          <p className="mt-1 text-xs text-gray-400">Kode pembayaran: {payment.code}</p>
          <div className="mt-6 flex flex-col gap-3">
            {payment.gateway === 'midtrans' && payment.snap_token && (
              <button onClick={payMidtrans} className="btn-primary py-3">Bayar Sekarang (Midtrans)</button>
            )}
            {payment.gateway === 'xendit' && payment.payment_url && (
              <a href={payment.payment_url} className="btn-primary py-3" rel="noopener noreferrer">Bayar Sekarang (Xendit)</a>
            )}
            {payment.can_simulate && (
              <>
                <div className="rounded bg-yellow-50 p-3 text-xs text-yellow-800">
                  Mode development: payment gateway belum dikonfigurasi. Isi MIDTRANS_* atau XENDIT_* di .env backend untuk pembayaran nyata.
                </div>
                <button disabled={busy} onClick={simulate} className="btn-primary py-3">Simulasikan Pembayaran Berhasil</button>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-6xl">⌛</p>
          <h1 className="mt-4 text-2xl font-semibold text-gray-600">Pembayaran {payment.status === 'expired' ? 'Kedaluwarsa' : 'Gagal'}</h1>
        </>
      )}
      <div className="mt-6 border-t pt-4 text-left text-sm">
        <p className="mb-2 font-medium">Pesanan:</p>
        {payment.orders?.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="flex justify-between py-1 text-blue-600">
            <span>{o.order_number} · {o.shop?.name}</span>
            <span>{rupiah(o.total)}</span>
          </Link>
        ))}
      </div>
      <Link to="/orders" className="btn-ghost mt-4">Lihat Pesanan Saya</Link>
    </div>
  )
}

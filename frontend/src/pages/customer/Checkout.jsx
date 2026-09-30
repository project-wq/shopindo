import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Empty, ErrorBox, Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function Checkout() {
  const { data: addresses, loading: loadingAddr } = useFetch('/addresses')
  const { refreshCart } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [addressId, setAddressId] = useState(null)
  const [shops, setShops] = useState({})
  const [platformVoucher, setPlatformVoucher] = useState('')
  const [voucherInput, setVoucherInput] = useState('')
  const [quote, setQuote] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (addresses?.length && !addressId) setAddressId((addresses.find((a) => a.is_default) || addresses[0]).id)
  }, [addresses, addressId])

  const payload = useCallback(
    () => ({
      address_id: addressId,
      shops: Object.entries(shops).map(([shop_id, s]) => ({ shop_id: Number(shop_id), ...s })),
      platform_voucher_code: platformVoucher || null,
    }),
    [addressId, shops, platformVoucher],
  )

  useEffect(() => {
    if (!addressId) return
    let cancelled = false
    setError('')
    api
      .post('/checkout/quote', payload())
      .then((r) => !cancelled && setQuote(r.data))
      .catch((e) => {
        if (cancelled) return
        setError(errorMessage(e))
        if (platformVoucher && /voucher/i.test(errorMessage(e))) setPlatformVoucher('')
      })
    return () => {
      cancelled = true
    }
  }, [addressId, payload, platformVoucher])

  const setShop = (shopId, patch) => setShops((s) => ({ ...s, [shopId]: { ...s[shopId], ...patch } }))

  const placeOrder = async () => {
    const missing = quote.groups.find((g) => !g.selected_rate)
    if (missing) return toast(`Pilih jasa kirim untuk ${missing.shop.name}`, 'error')
    setBusy(true)
    try {
      const { data } = await api.post('/checkout', payload())
      refreshCart()
      navigate(`/payment/${data.payment.code}`, { replace: true })
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loadingAddr) return <Spinner />
  if (!addresses?.length)
    return (
      <Empty title="Tambahkan alamat pengiriman terlebih dahulu">
        <Link to="/account?tab=address" className="btn-primary mt-4">Tambah Alamat</Link>
      </Empty>
    )

  return (
    <div className="space-y-3">
      <div className="card border-t-4 border-brand p-5">
        <h2 className="mb-3 text-lg text-brand">📍 Alamat Pengiriman</h2>
        <div className="space-y-2">
          {addresses.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="radio" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1" />
              <span>
                <b>{a.recipient_name} ({a.phone})</b> {a.address_line}, {a.destination_label} {a.postal_code}
                {a.is_default && <span className="ml-2 border border-brand px-1 text-xs text-brand">Utama</span>}
              </span>
            </label>
          ))}
        </div>
        <Link to="/account?tab=address" className="mt-2 inline-block text-sm text-blue-600">+ Kelola alamat</Link>
      </div>

      <ErrorBox message={error} />
      {!quote ? (
        !error && <Spinner />
      ) : (
        <>
          {quote.groups.map((g) => (
            <div key={g.shop.id} className="card">
              <div className="border-b px-5 py-3 font-medium">🏪 {g.shop.name}</div>
              {g.items.map((item) => (
                <div key={item.cart_item_id} className="grid grid-cols-[1fr_120px_80px_120px] items-center gap-3 border-b px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <img src={item.image} alt="" className="h-12 w-12 object-cover" />
                    <div>
                      <p className="line-clamp-1">{item.name}</p>
                      {item.variant_name && <p className="text-xs text-gray-500">Variasi: {item.variant_name}</p>}
                    </div>
                  </div>
                  <span className="text-right">{rupiah(item.price)}</span>
                  <span className="text-center">x{item.quantity}</span>
                  <span className="text-right">{rupiah(item.subtotal)}</span>
                </div>
              ))}
              <div className="grid gap-4 bg-blue-50/40 px-5 py-4 text-sm md:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <span className="w-24 shrink-0">Pesan:</span>
                    <input className="input" maxLength={255} placeholder="(Opsional) Tinggalkan pesan ke penjual" onBlur={(e) => setShop(g.shop.id, { note: e.target.value || null })} />
                  </label>
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      setShop(g.shop.id, { voucher_code: new FormData(e.target).get('code').trim().toUpperCase() || null })
                    }}
                  >
                    <span className="w-24 shrink-0">Voucher Toko:</span>
                    <input name="code" className="input" maxLength={32} placeholder="Kode voucher" defaultValue={shops[g.shop.id]?.voucher_code || ''} />
                    <button className="btn-ghost">Pakai</button>
                  </form>
                  {g.shop_voucher && <p className="text-xs text-green-600">✓ {g.shop_voucher.name} (-{rupiah(g.shop_discount)})</p>}
                </div>
                <div>
                  <p className="mb-1 font-medium text-teal-600">Opsi Pengiriman</p>
                  <select
                    className="input"
                    value={g.selected_rate ? `${g.selected_rate.code}|${g.selected_rate.service}` : ''}
                    onChange={(e) => {
                      const [courier_code, courier_service] = e.target.value.split('|')
                      setShop(g.shop.id, { courier_code, courier_service })
                    }}
                  >
                    <option value="">-- Pilih jasa kirim --</option>
                    {g.shipping_rates.map((r) => (
                      <option key={`${r.code}|${r.service}`} value={`${r.code}|${r.service}`}>
                        {r.name} {r.service} — {rupiah(r.cost)} {r.etd && `(${r.etd} hari)`}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Berat total {g.weight} gr · Ongkir dihitung otomatis</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-5 py-3 text-sm">
                Total Pesanan ({g.items.length} produk): <span className="text-lg text-brand">{rupiah(g.total)}</span>
              </div>
            </div>
          ))}

          <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <span className="text-lg">🎟️ Voucher ShopIndo</span>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setPlatformVoucher(voucherInput.trim().toUpperCase())
              }}
            >
              <input className="input" value={voucherInput} onChange={(e) => setVoucherInput(e.target.value)} placeholder="GRATISONGKIR / HEMAT10" maxLength={32} />
              <button className="btn-outline">Pakai</button>
            </form>
            {quote.platform_voucher && <p className="w-full text-right text-sm text-green-600">✓ {quote.platform_voucher.name}</p>}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between border-b pb-4">
              <span className="text-lg">Metode Pembayaran</span>
              <span className="text-sm">
                {{ midtrans: 'Midtrans (VA, QRIS, e-Wallet, Kartu)', xendit: 'Xendit (VA, QRIS, e-Wallet, Retail)', mock: 'Simulasi Pembayaran (Mode Development)' }[quote.payment_gateway]}
              </span>
            </div>
            <dl className="ml-auto mt-4 w-full max-w-sm space-y-2 text-sm">
              <Row label="Subtotal produk" value={rupiah(quote.summary.subtotal)} />
              <Row label="Total ongkos kirim" value={rupiah(quote.summary.shipping_cost)} />
              {quote.summary.shipping_discount > 0 && <Row label="Diskon ongkir" value={`-${rupiah(quote.summary.shipping_discount)}`} />}
              {quote.summary.shop_discount > 0 && <Row label="Voucher toko" value={`-${rupiah(quote.summary.shop_discount)}`} />}
              {quote.summary.platform_discount > 0 && <Row label="Voucher ShopIndo" value={`-${rupiah(quote.summary.platform_discount)}`} />}
              <div className="flex justify-between pt-2">
                <dt>Total Pembayaran</dt>
                <dd className="text-2xl text-brand">{rupiah(quote.summary.total)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-end border-t pt-4">
              <button disabled={busy} onClick={placeOrder} className="btn-primary px-16 py-3">{busy ? 'Memproses...' : 'Buat Pesanan'}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-gray-600">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

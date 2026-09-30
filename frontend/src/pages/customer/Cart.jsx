import { Link, useNavigate } from 'react-router-dom'
import { Empty, Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { rupiah } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function Cart() {
  const { data, loading, reload } = useFetch('/cart')
  const { refreshCart } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const run = async (fn) => {
    try {
      await fn()
      await reload()
      refreshCart()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  if (loading && !data) return <Spinner />
  const groups = data?.groups || []
  if (!groups.length)
    return (
      <Empty title="Keranjang belanja Anda kosong">
        <Link to="/" className="btn-primary mt-4">Belanja Sekarang</Link>
      </Empty>
    )

  const items = groups.flatMap((g) => g.items)
  const selected = items.filter((i) => i.is_selected && i.is_available)
  const allSelected = items.filter((i) => i.is_available).every((i) => i.is_selected)
  const total = selected.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const saved = selected.reduce((s, i) => s + (i.original_price - i.unit_price) * i.quantity, 0)

  return (
    <div className="space-y-3 pb-24">
      <div className="card grid grid-cols-[1fr_120px_140px_120px_80px] items-center px-5 py-4 text-sm text-gray-500">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={allSelected} onChange={(e) => run(() => api.patch('/cart/select-all', { is_selected: e.target.checked }))} />
          Produk
        </label>
        <span className="text-center">Harga Satuan</span>
        <span className="text-center">Kuantitas</span>
        <span className="text-center">Total Harga</span>
        <span className="text-center">Aksi</span>
      </div>

      {groups.map((g) => (
        <div key={g.shop.id} className="card">
          <div className="flex items-center gap-3 border-b px-5 py-3">
            <input
              type="checkbox"
              checked={g.items.filter((i) => i.is_available).every((i) => i.is_selected)}
              onChange={(e) => run(() => api.patch('/cart/select-all', { is_selected: e.target.checked, shop_id: g.shop.id }))}
            />
            <Link to={`/shop/${g.shop.slug}`} className="font-medium">🏪 {g.shop.name}</Link>
          </div>
          {g.items.map((item) => (
            <div key={item.id} className={`grid grid-cols-[1fr_120px_140px_120px_80px] items-center border-b px-5 py-4 text-sm last:border-0 ${!item.is_available ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  disabled={!item.is_available}
                  checked={item.is_selected && item.is_available}
                  onChange={(e) => run(() => api.patch(`/cart/${item.id}`, { is_selected: e.target.checked }))}
                />
                <img src={item.product.image} alt="" className="h-20 w-20 object-cover" />
                <div>
                  <Link to={`/product/${item.product.slug}`} className="line-clamp-2">{item.product.name}</Link>
                  {item.variant && <p className="text-xs text-gray-500">Variasi: {item.variant.name}</p>}
                  {item.product.flash_sale && <span className="text-xs text-brand">⚡ Flash Sale</span>}
                  {!item.is_available && <p className="text-xs text-red-500">Produk tidak tersedia</p>}
                </div>
              </div>
              <div className="text-center">
                {item.original_price > item.unit_price && <p className="text-xs text-gray-400 line-through">{rupiah(item.original_price)}</p>}
                <p>{rupiah(item.unit_price)}</p>
              </div>
              <div className="flex justify-center">
                <div className="flex border">
                  <button className="px-2" disabled={item.quantity <= 1} onClick={() => run(() => api.patch(`/cart/${item.id}`, { quantity: item.quantity - 1 }))}>−</button>
                  <span className="w-10 border-x py-1 text-center">{item.quantity}</span>
                  <button className="px-2" disabled={item.quantity >= item.stock} onClick={() => run(() => api.patch(`/cart/${item.id}`, { quantity: item.quantity + 1 }))}>+</button>
                </div>
              </div>
              <p className="text-center text-brand">{rupiah(item.unit_price * item.quantity)}</p>
              <button className="text-center hover:text-brand" onClick={() => run(() => api.delete(`/cart/${item.id}`))}>Hapus</button>
            </div>
          ))}
        </div>
      ))}

      <div className="fixed right-0 bottom-0 left-0 z-30 border-t bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-6 px-4 py-4">
          <div className="text-right">
            <p>
              Total ({selected.length} produk): <span className="text-2xl text-brand">{rupiah(total)}</span>
            </p>
            {saved > 0 && <p className="text-xs text-brand">Hemat {rupiah(saved)}</p>}
          </div>
          <button disabled={!selected.length} onClick={() => navigate('/checkout')} className="btn-primary px-12 py-3">
            Checkout
          </button>
        </div>
      </div>
    </div>
  )
}

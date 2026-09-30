import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ProductCard from '../../components/ProductCard'
import { Empty, Pagination, Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateOnly, rupiah, shortNumber, voucherLabel } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function ShopPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('sales')
  const { data: shop, loading, setData } = useFetch(`/shops/${slug}`)
  const { data: products } = useFetch('/products', { shop: slug, page, sort, per_page: 20 })

  if (loading) return <Spinner />
  if (!shop) return <Empty title="Toko tidak ditemukan" />

  const follow = async () => {
    if (!user) return navigate('/login')
    const { data } = await api.post(`/shops/${shop.id}/follow`)
    setData({ ...shop, is_following: data.following, followers_count: shop.followers_count + (data.following ? 1 : -1) })
  }
  const chat = async () => {
    if (!user) return navigate('/login')
    try {
      const { data } = await api.post(`/chats/shops/${shop.id}`)
      navigate(`/chat?c=${data.id}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="card grid gap-6 p-5 md:grid-cols-[380px_1fr]">
        <div className="relative overflow-hidden rounded bg-gradient-to-br from-gray-700 to-gray-900 p-5 text-white">
          {shop.banner && <img src={shop.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
          <div className="relative flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white/30 bg-white text-3xl">
              {shop.logo ? <img src={shop.logo} alt="" className="h-full w-full object-cover" /> : '🏪'}
            </div>
            <div>
              {shop.is_official && <span className="rounded-sm bg-brand px-1.5 text-xs">Mall</span>}
              <h1 className="text-xl font-semibold">{shop.name}</h1>
              <p className="text-xs opacity-80">{shop.origin_label}</p>
            </div>
          </div>
          <div className="relative mt-4 flex gap-2">
            <button onClick={follow} className="flex-1 rounded border border-white py-1 text-sm">{shop.is_following ? '✓ Mengikuti' : '+ Ikuti'}</button>
            <button onClick={chat} className="flex-1 rounded border border-white py-1 text-sm">💬 Chat</button>
          </div>
        </div>
        <div className="grid grid-cols-2 content-center gap-4 text-sm">
          <p>📦 Produk: <span className="text-brand">{shop.products_count}</span></p>
          <p>👥 Pengikut: <span className="text-brand">{shortNumber(shop.followers_count)}</span></p>
          <p>⭐ Penilaian: <span className="text-brand">{Number(shop.rating_avg).toFixed(1)} ({shortNumber(shop.rating_count)})</span></p>
          <p>🕐 Bergabung: <span className="text-brand">{dateOnly(shop.created_at)}</span></p>
          <p className="col-span-2 text-gray-600">{shop.description}</p>
        </div>
      </div>

      {shop.vouchers?.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-gray-500 uppercase">Voucher Toko</h2>
          <div className="flex gap-3 overflow-x-auto">
            {shop.vouchers.map((v) => (
              <div key={v.id} className="shrink-0 rounded border border-brand bg-brand-light px-4 py-3 text-sm">
                <p className="font-semibold text-brand">{voucherLabel(v)}</p>
                <p className="text-xs text-gray-600">Min. belanja {rupiah(v.min_purchase)}</p>
                <p className="text-xs">Kode: <b>{v.code}</b></p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 bg-gray-200/70 px-4 py-3 text-sm">
        {[['sales', 'Terlaris'], ['latest', 'Terbaru'], ['price_asc', 'Harga ↑'], ['price_desc', 'Harga ↓']].map(([v, l]) => (
          <button key={v} onClick={() => { setSort(v); setPage(1) }} className={`rounded-sm px-4 py-1.5 ${sort === v ? 'bg-brand text-white' : 'bg-white'}`}>{l}</button>
        ))}
      </div>
      {products?.data?.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {products.data.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <Empty title="Belum ada produk" />
      )}
      <Pagination data={products} onPage={setPage} />
    </div>
  )
}

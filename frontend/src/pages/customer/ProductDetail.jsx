import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Countdown from '../../components/Countdown'
import ProductCard from '../../components/ProductCard'
import { Empty, Pagination, Spinner, Stars } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errorMessage } from '../../lib/api'
import { dateTime, rupiah, shortNumber } from '../../lib/format'
import useFetch from '../../lib/useFetch'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user, refreshCart } = useAuth()
  const { data: product, loading, error } = useFetch(`/products/${slug}`)
  const { data: related } = useFetch(`/products/${slug}/related`)
  const [reviewPage, setReviewPage] = useState(1)
  const { data: reviews } = useFetch(`/products/${slug}/reviews`, { page: reviewPage })
  const [image, setImage] = useState(0)
  const [variantId, setVariantId] = useState(null)
  const [qty, setQty] = useState(1)
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)

  const p = product?.data
  useEffect(() => {
    setImage(0)
    setVariantId(null)
    setQty(1)
  }, [slug])
  useEffect(() => {
    if (user && p?.id) api.get(`/wishlist/${p.id}`).then((r) => setLiked(r.data.wishlisted)).catch(() => {})
  }, [user, p?.id])

  if (loading) return <Spinner />
  if (error || !p) return <Empty title="Produk tidak ditemukan" />

  const variant = p.variants?.find((v) => v.id === variantId)
  const hasVariants = p.variants?.length > 0
  const basePrice = variant ? variant.price : p.min_price
  const flashPrice = p.flash_sale ? Math.min(basePrice, p.flash_sale.flash_price) : null
  const finalPrice = flashPrice ?? basePrice
  const stock = variant ? variant.stock : p.stock

  const requireLogin = () => {
    if (!user) {
      navigate('/login', { state: { from: `/product/${slug}` } })
      return true
    }
    return false
  }

  const addToCart = async (buyNow) => {
    if (requireLogin()) return
    if (hasVariants && !variant) return toast('Pilih variasi terlebih dahulu', 'error')
    setBusy(true)
    try {
      await api.post('/cart', { product_id: p.id, product_variant_id: variant?.id, quantity: qty, buy_now: buyNow })
      await refreshCart()
      if (buyNow) navigate('/checkout')
      else toast('Produk berhasil ditambahkan ke keranjang')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const toggleLike = async () => {
    if (requireLogin()) return
    const { data } = await api.post(`/wishlist/${p.id}`)
    setLiked(data.wishlisted)
  }

  const chat = async () => {
    if (requireLogin()) return
    try {
      const { data } = await api.post(`/chats/shops/${p.shop.id}`)
      navigate(`/chat?c=${data.id}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <nav className="text-sm text-gray-500">
        <Link to="/" className="text-blue-600">ShopIndo</Link> ›{' '}
        {p.category && <Link to={`/search?category=${p.category.slug}`} className="text-blue-600">{p.category.name}</Link>} › {p.name}
      </nav>

      <div className="card grid gap-6 p-5 md:grid-cols-[400px_1fr]">
        <div>
          <img src={p.images?.[image]?.url} alt={p.name} className="aspect-square w-full rounded object-cover" />
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {p.images?.map((img, i) => (
              <button key={img.id} onMouseEnter={() => setImage(i)} onClick={() => setImage(i)} className={`h-20 w-20 shrink-0 border-2 ${i === image ? 'border-brand' : 'border-transparent'}`}>
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <button onClick={toggleLike} className="mt-3 text-sm">
            {liked ? '❤️' : '🤍'} Favorit
          </button>
        </div>

        <div>
          <h1 className="text-xl">
            {p.shop?.is_official && <span className="mr-2 rounded-sm bg-brand px-1.5 py-0.5 text-xs text-white">Mall</span>}
            {p.name}
          </h1>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 border-r pr-4 text-brand">
              <u>{Number(p.rating_avg).toFixed(1)}</u> <Stars value={p.rating_avg} />
            </span>
            <span className="border-r pr-4"><u>{shortNumber(p.rating_count)}</u> Penilaian</span>
            <span>{shortNumber(p.sold_count)} Terjual</span>
          </div>

          {p.flash_sale && (
            <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-brand to-orange-400 px-4 py-2 text-white">
              <span className="font-bold italic">⚡ FLASH SALE</span>
              <span className="flex items-center gap-2 text-sm">
                BERAKHIR DALAM {p.flash_sale.ends_at && <Countdown to={p.flash_sale.ends_at} />}
              </span>
            </div>
          )}
          <div className="flex items-center gap-4 bg-gray-50 px-5 py-4">
            {finalPrice < basePrice && <span className="text-gray-400 line-through">{rupiah(basePrice)}</span>}
            <span className="text-3xl font-medium text-brand">
              {!variant && hasVariants && p.max_price !== p.min_price && !flashPrice ? `${rupiah(p.min_price)} - ${rupiah(p.max_price)}` : rupiah(finalPrice)}
            </span>
            {finalPrice < basePrice && (
              <span className="rounded-sm bg-brand px-1 text-xs font-bold text-white">{Math.round((1 - finalPrice / basePrice) * 100)}% OFF</span>
            )}
          </div>

          <div className="mt-6 space-y-6 text-sm">
            <div className="flex gap-4">
              <span className="w-28 shrink-0 text-gray-500">Pengiriman</span>
              <span>🚚 Dikirim dari <b>{p.shop?.origin_label}</b> · Berat {p.weight} gr · Ongkir dihitung otomatis saat checkout</span>
            </div>
            {hasVariants && (
              <div className="flex gap-4">
                <span className="w-28 shrink-0 text-gray-500">Variasi</span>
                <div className="flex flex-wrap gap-2">
                  {p.variants.map((v) => (
                    <button
                      key={v.id}
                      disabled={v.stock < 1}
                      onClick={() => setVariantId(v.id === variantId ? null : v.id)}
                      className={`rounded-sm border px-4 py-2 disabled:opacity-40 ${v.id === variantId ? 'border-brand text-brand' : 'border-gray-300'}`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <span className="w-28 shrink-0 text-gray-500">Kuantitas</span>
              <div className="flex items-center border">
                <button className="px-3 py-1" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <input
                  className="w-14 border-x py-1 text-center outline-none"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(stock || 1, parseInt(e.target.value, 10) || 1)))}
                  aria-label="Kuantitas"
                />
                <button className="px-3 py-1" onClick={() => setQty((q) => Math.min(stock || 1, q + 1))}>+</button>
              </div>
              <span className="text-gray-500">tersisa {stock} buah</span>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button disabled={busy || stock < 1} onClick={() => addToCart(false)} className="btn-outline px-6 py-3">
              🛒 Masukkan Keranjang
            </button>
            <button disabled={busy || stock < 1} onClick={() => addToCart(true)} className="btn-primary px-10 py-3">
              {stock < 1 ? 'Stok Habis' : 'Beli Sekarang'}
            </button>
          </div>
        </div>
      </div>

      {p.shop && (
        <div className="card flex flex-wrap items-center gap-6 p-5">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-light text-2xl">
            {p.shop.logo ? <img src={p.shop.logo} alt="" className="h-full w-full object-cover" /> : '🏪'}
          </div>
          <div className="flex-1">
            <p className="font-medium">{p.shop.name}</p>
            <p className="text-xs text-gray-500">{p.shop.origin_label}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={chat} className="btn-outline py-1 text-xs">💬 Chat Sekarang</button>
              <Link to={`/shop/${p.shop.slug}`} className="btn-ghost py-1 text-xs">🏪 Kunjungi Toko</Link>
            </div>
          </div>
          <div className="text-sm text-gray-500">Rating toko: <span className="text-brand">{Number(p.shop.rating_avg).toFixed(1)}</span></div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-4 bg-gray-50 px-4 py-3 text-lg">Deskripsi Produk</h2>
        <p className="px-4 text-sm leading-relaxed whitespace-pre-line">{p.description}</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-lg">Penilaian Produk</h2>
        {reviews?.data?.length ? (
          <div className="divide-y">
            {reviews.data.map((r) => (
              <div key={r.id} className="flex gap-3 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200">👤</div>
                <div className="text-sm">
                  <p className="text-xs">{r.user?.name}</p>
                  <Stars value={r.rating} />
                  <p className="text-xs text-gray-400">{dateTime(r.created_at)} {r.order_item?.variant_name && `| Variasi: ${r.order_item.variant_name}`}</p>
                  <p className="mt-2">{r.comment}</p>
                  {r.seller_reply && <p className="mt-2 rounded bg-gray-50 p-2 text-xs"><b>Respon Penjual:</b> {r.seller_reply}</p>}
                </div>
              </div>
            ))}
            <Pagination data={reviews} onPage={setReviewPage} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Belum ada penilaian.</p>
        )}
      </div>

      {related?.data?.length > 0 && (
        <div>
          <h2 className="mb-3 text-gray-500 uppercase">Produk Serupa</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {related.data.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

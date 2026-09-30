import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Countdown from '../../components/Countdown'
import ProductCard from '../../components/ProductCard'
import { Spinner } from '../../components/ui'
import useFetch from '../../lib/useFetch'
import { rupiah, voucherLabel } from '../../lib/format'

export default function Home() {
  const { data, loading } = useFetch('/home')
  const { data: vouchers } = useFetch('/vouchers')
  const [slide, setSlide] = useState(0)
  const banners = data?.banners || []

  useEffect(() => {
    if (banners.length < 2) return
    const t = setInterval(() => setSlide((s) => (s + 1) % banners.length), 4000)
    return () => clearInterval(t)
  }, [banners.length])

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      {banners.length > 0 && (
        <div className="relative overflow-hidden rounded-sm">
          <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${slide * 100}%)` }}>
            {banners.map((b) => (
              <Link key={b.id} to={b.link || '/'} className="relative w-full shrink-0">
                <img src={b.image} alt={b.title} className="aspect-[3/1] w-full object-cover" />
                <span className="absolute bottom-4 left-6 rounded bg-black/40 px-4 py-2 text-xl font-bold text-white">{b.title}</span>
              </Link>
            ))}
          </div>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button key={b.id} onClick={() => setSlide(i)} className={`h-2 w-2 rounded-full ${i === slide ? 'bg-brand' : 'bg-white/70'}`} aria-label={`Banner ${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      {vouchers?.length > 0 && (
        <div className="flex gap-3 overflow-x-auto">
          {vouchers.map((v) => (
            <div key={v.id} className="flex shrink-0 items-center gap-3 rounded border-l-4 border-brand bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-brand">{voucherLabel(v)}</p>
                <p className="text-xs text-gray-500">Min. belanja {rupiah(v.min_purchase)} · Kode <b>{v.code}</b></p>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="card">
        <h2 className="border-b px-5 py-4 text-gray-500 uppercase">Kategori</h2>
        <div className="grid grid-cols-5 md:grid-cols-10">
          {data.categories.map((c) => (
            <Link key={c.id} to={`/search?category=${c.slug}`} className="flex flex-col items-center gap-2 border-r border-b p-3 text-center text-xs hover:shadow">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-3xl">{c.icon || '📦'}</span>
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      {data.flash_sale && data.flash_sale.products.length > 0 && (
        <section className="card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-brand italic">⚡ FLASH SALE</h2>
              <Countdown to={data.flash_sale.ends_at} />
            </div>
            <Link to="/flash-sale" className="text-sm text-brand">Lihat Semua ›</Link>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-6">
            {data.flash_sale.products.map((p) => (
              <Link key={p.id} to={`/product/${p.slug}`} className="text-center">
                <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" loading="lazy" />
                <p className="mt-2 text-lg font-medium text-brand">{rupiah(p.final_price)}</p>
                <div className="relative mx-2 h-4 overflow-hidden rounded-full bg-orange-200">
                  <div className="h-full bg-gradient-to-r from-brand to-orange-400" style={{ width: `${Math.min(100, ((p.flash_sale?.sold || 0) / (p.flash_sale?.stock || 1)) * 100)}%` }} />
                  <span className="absolute inset-0 text-[10px] leading-4 font-bold text-white uppercase">{p.flash_sale?.sold} terjual</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="border-b-4 border-brand bg-white py-4 text-center font-medium text-brand uppercase">Rekomendasi</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {data.recommended.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-5 text-center">
          <Link to="/search" className="btn-ghost px-16">Lihat Lainnya</Link>
        </div>
      </section>
    </div>
  )
}

import { Link } from 'react-router-dom'
import api from '../lib/api'
import { rupiah, shortNumber } from '../lib/format'

export default function ProductCard({ product }) {
  const discount = product.final_price < product.min_price ? Math.round((1 - product.final_price / product.min_price) * 100) : 0
  const trackAd = () => product.ad_id && api.post(`/ads/${product.ad_id}/click`).catch(() => {})

  return (
    <Link
      to={`/product/${product.slug}`}
      onClick={trackAd}
      className="group relative flex flex-col overflow-hidden rounded-sm border border-transparent bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
    >
      <div className="relative aspect-square bg-gray-100">
        {product.image && <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />}
        {discount > 0 && (
          <span className="absolute top-0 right-0 bg-yellow-300 px-1.5 py-1 text-xs font-bold text-brand">-{discount}%</span>
        )}
        {product.shop?.is_official && (
          <span className="absolute top-2 left-0 bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">Mall</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2">
        <p className="line-clamp-2 min-h-[2.5rem] text-xs text-gray-800">{product.name}</p>
        {product.flash_sale && <span className="mt-1 w-fit rounded-sm border border-brand px-1 text-[10px] text-brand">⚡ Flash Sale</span>}
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="font-medium text-brand">{rupiah(product.final_price)}</span>
          <span className="text-[10px] text-gray-500">{shortNumber(product.sold_count)} terjual</span>
        </div>
        {product.shop && <p className="mt-1 truncate text-[10px] text-gray-400">{product.shop.origin_label?.split(',').slice(-2, -1)[0]}</p>}
      </div>
      {product.is_ad && <span className="absolute bottom-1 left-1 rounded bg-gray-500/70 px-1 text-[9px] text-white">Iklan</span>}
    </Link>
  )
}

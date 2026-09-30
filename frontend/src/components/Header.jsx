import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { user, logout, cartCount } = useAuth()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const navigate = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-brand to-[#f63] text-white shadow">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between py-1.5 text-xs">
          <div className="flex gap-4">
            {user?.role === 'seller' ? (
              <Link to="/seller" className="hover:opacity-80">Seller Centre</Link>
            ) : user?.role === 'admin' ? (
              <Link to="/admin" className="hover:opacity-80">Admin Panel</Link>
            ) : (
              <Link to={user ? '/open-shop' : '/login'} className="hover:opacity-80">Mulai Berjualan</Link>
            )}
            <span className="hidden sm:inline">Download Aplikasi</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <Link to="/notifications" className="hover:opacity-80">🔔 Notifikasi</Link>
                <Link to="/chat" className="hover:opacity-80">💬 Chat</Link>
              </>
            )}
            {user ? (
              <div className="group relative">
                <span className="cursor-pointer font-medium">👤 {user.name}</span>
                <div className="invisible absolute right-0 z-50 w-44 pt-2 group-hover:visible">
                  <div className="rounded bg-white py-1 text-sm text-gray-700 shadow-lg">
                    <Link to="/account" className="block px-4 py-2 hover:bg-gray-50">Akun Saya</Link>
                    <Link to="/orders" className="block px-4 py-2 hover:bg-gray-50">Pesanan Saya</Link>
                    <Link to="/wishlist" className="block px-4 py-2 hover:bg-gray-50">Favorit</Link>
                    <button onClick={() => logout().then(() => navigate('/'))} className="block w-full px-4 py-2 text-left hover:bg-gray-50">
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 font-medium">
                <Link to="/register" className="hover:opacity-80">Daftar</Link>
                <span className="opacity-50">|</span>
                <Link to="/login" className="hover:opacity-80">Log In</Link>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded bg-white text-xl text-brand">🛍</span>
            ShopIndo
          </Link>
          <form onSubmit={submit} className="flex flex-1 rounded-sm bg-white p-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={100}
              placeholder="Cari produk, toko, dan merek"
              className="flex-1 px-3 text-sm text-gray-800 outline-none"
              aria-label="Cari produk"
            />
            <button className="rounded-sm bg-brand px-6 py-2 text-sm hover:bg-brand-dark" aria-label="Cari">🔍</button>
          </form>
          <Link to="/cart" className="relative shrink-0 text-3xl" aria-label="Keranjang">
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-3 rounded-full border-2 border-brand bg-white px-1.5 text-xs font-bold text-brand">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'

export default function CustomerLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

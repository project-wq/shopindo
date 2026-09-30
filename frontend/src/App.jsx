import { Route, Routes } from 'react-router-dom'
import CustomerLayout from './components/CustomerLayout'
import RequireAuth from './components/RequireAuth'
import { Empty } from './components/ui'
import AdminBanners from './pages/admin/Banners'
import AdminCategories from './pages/admin/Categories'
import AdminDashboard from './pages/admin/Dashboard'
import AdminFlashSales from './pages/admin/FlashSales'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOrders from './pages/admin/Orders'
import AdminProducts from './pages/admin/Products'
import AdminShops from './pages/admin/Shops'
import AdminUsers from './pages/admin/Users'
import AdminVouchers from './pages/admin/Vouchers'
import AdminWithdrawals from './pages/admin/Withdrawals'
import Account from './pages/customer/Account'
import Cart from './pages/customer/Cart'
import Chat from './pages/customer/Chat'
import Checkout from './pages/customer/Checkout'
import FlashSale from './pages/customer/FlashSale'
import Home from './pages/customer/Home'
import Login from './pages/customer/Login'
import Notifications from './pages/customer/Notifications'
import OpenShop from './pages/customer/OpenShop'
import OrderDetail from './pages/customer/OrderDetail'
import Orders from './pages/customer/Orders'
import Payment from './pages/customer/Payment'
import ProductDetail from './pages/customer/ProductDetail'
import Register from './pages/customer/Register'
import Search from './pages/customer/Search'
import ShopPage from './pages/customer/ShopPage'
import Wishlist from './pages/customer/Wishlist'
import SellerAds from './pages/seller/Ads'
import SellerDashboard from './pages/seller/Dashboard'
import SellerFinance from './pages/seller/Finance'
import SellerFlashSales from './pages/seller/FlashSales'
import SellerLayout from './pages/seller/SellerLayout'
import SellerOrders from './pages/seller/Orders'
import SellerProductForm from './pages/seller/ProductForm'
import SellerProducts from './pages/seller/Products'
import SellerReviews from './pages/seller/Reviews'
import SellerSettings from './pages/seller/Settings'
import SellerVouchers from './pages/seller/Vouchers'

const auth = (el, role) => <RequireAuth role={role}>{el}</RequireAuth>

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<CustomerLayout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="product/:slug" element={<ProductDetail />} />
        <Route path="shop/:slug" element={<ShopPage />} />
        <Route path="flash-sale" element={<FlashSale />} />
        <Route path="cart" element={auth(<Cart />)} />
        <Route path="checkout" element={auth(<Checkout />)} />
        <Route path="payment/:code" element={auth(<Payment />)} />
        <Route path="orders" element={auth(<Orders />)} />
        <Route path="orders/:id" element={auth(<OrderDetail />)} />
        <Route path="account" element={auth(<Account />)} />
        <Route path="wishlist" element={auth(<Wishlist />)} />
        <Route path="notifications" element={auth(<Notifications />)} />
        <Route path="chat" element={auth(<Chat />)} />
        <Route path="open-shop" element={auth(<OpenShop />)} />
        <Route path="*" element={<Empty title="Halaman tidak ditemukan" />} />
      </Route>

      <Route path="/seller" element={auth(<SellerLayout />, 'seller')}>
        <Route index element={<SellerDashboard />} />
        <Route path="orders" element={<SellerOrders />} />
        <Route path="products" element={<SellerProducts />} />
        <Route path="products/new" element={<SellerProductForm />} />
        <Route path="products/:id" element={<SellerProductForm />} />
        <Route path="vouchers" element={<SellerVouchers />} />
        <Route path="flash-sales" element={<SellerFlashSales />} />
        <Route path="ads" element={<SellerAds />} />
        <Route path="finance" element={<SellerFinance />} />
        <Route path="reviews" element={<SellerReviews />} />
        <Route path="chat" element={<Chat asSeller />} />
        <Route path="settings" element={<SellerSettings />} />
      </Route>

      <Route path="/admin" element={auth(<AdminLayout />, 'admin')}>
        <Route index element={<AdminDashboard />} />
        <Route path="shops" element={<AdminShops />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="flash-sales" element={<AdminFlashSales />} />
        <Route path="vouchers" element={<AdminVouchers />} />
        <Route path="banners" element={<AdminBanners />} />
        <Route path="withdrawals" element={<AdminWithdrawals />} />
      </Route>
    </Routes>
  )
}

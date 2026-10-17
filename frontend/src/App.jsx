import { Routes, Route, Outlet, Link } from 'react-router-dom';
import Navbar from './components/Navbar.jsx'; import Footer from './components/Footer.jsx'; import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx'; import Products from './pages/Products.jsx'; import ProductDetails from './pages/ProductDetails.jsx';
import { Login, Register, Forgot } from './pages/Auth.jsx'; import { Cart, Checkout, Confirmation, Orders, OrderDetails, Wishlist, Profile } from './pages/Account.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx'; import { Dashboard, AdminProducts, AdminCategories, AdminOrders, AdminUsers, AdminCoupons, AdminReviews } from './pages/admin/Pages.jsx';
const Shell = () => <div className="flex min-h-screen flex-col"><Navbar /><main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8"><Outlet /></main><Footer /></div>;
const NotFound = () => <div className="py-20 text-center"><h1 className="text-4xl">Page not found</h1><Link to="/" className="btn btn-dark mt-6">Back home</Link></div>;
const P = ({ children, ...p }) => <ProtectedRoute {...p}>{children}</ProtectedRoute>;
export default function App() {
  return <Routes>
    <Route element={<Shell />}>
      <Route path="/" element={<Home />} /><Route path="/products" element={<Products />} /><Route path="/products/:id" element={<ProductDetails />} />
      <Route path="/categories/:slug" element={<Products />} />
      <Route path="/login" element={<P guest><Login /></P>} /><Route path="/register" element={<P guest><Register /></P>} /><Route path="/forgot-password" element={<P guest><Forgot /></P>} />
      <Route path="/profile" element={<P><Profile /></P>} /><Route path="/wishlist" element={<P><Wishlist /></P>} /><Route path="/cart" element={<P><Cart /></P>} />
      <Route path="/checkout" element={<P><Checkout /></P>} /><Route path="/orders" element={<P><Orders /></P>} />
      <Route path="/orders/:id" element={<P><OrderDetails /></P>} /><Route path="/orders/:id/confirmation" element={<P><Confirmation /></P>} />
      <Route path="*" element={<NotFound />} />
    </Route>
    <Route path="/admin" element={<P role="admin"><AdminLayout /></P>}>
      <Route index element={<Dashboard />} /><Route path="products" element={<AdminProducts />} /><Route path="categories" element={<AdminCategories />} />
      <Route path="orders" element={<AdminOrders />} /><Route path="users" element={<AdminUsers />} /><Route path="coupons" element={<AdminCoupons />} />
      <Route path="reviews" element={<AdminReviews />} /><Route path="analytics" element={<Dashboard full />} />
    </Route>
  </Routes>;
}

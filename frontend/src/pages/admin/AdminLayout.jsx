import { NavLink, Outlet, Link } from 'react-router-dom';
const nav = [['/admin', 'Overview'], ['/admin/products', 'Products'], ['/admin/categories', 'Categories'], ['/admin/orders', 'Orders'], ['/admin/users', 'Customers'], ['/admin/coupons', 'Coupons'], ['/admin/reviews', 'Reviews'], ['/admin/analytics', 'Analytics']];
export default function AdminLayout() {
  return <div className="min-h-screen bg-stone-100"><header className="flex items-center justify-between bg-ink px-4 py-3 text-white"><span className="font-display text-xl">Threadly Admin</span><Link to="/" className="text-sm text-stone-300">← Storefront</Link></header>
    <div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[180px_1fr]"><nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Admin">{nav.map(([to, l]) =>
      <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-white font-medium shadow-sm' : 'text-stone-600 hover:bg-white/60'}`}>{l}</NavLink>)}</nav>
      <section className="min-w-0"><Outlet /></section></div></div>;
}

import { useState } from 'react'; import { Link, useNavigate } from 'react-router-dom'; import { Heart, ShoppingBag, Menu, X, Search } from 'lucide-react'; import { useApp } from '../context/AppContext.jsx';
export default function Navbar() {
  const { user, cart, wish, logout } = useApp(), nav = useNavigate(), [open, setOpen] = useState(false), [q, setQ] = useState('');
  const count = cart.items.reduce((s, i) => s + i.quantity, 0);
  const go = (e) => { e.preventDefault(); nav(`/products?q=${encodeURIComponent(q)}`); setOpen(false); };
  const links = [['/products', 'Shop'], ...(user ? [['/orders', 'Orders'], ['/profile', 'Profile']] : [['/login', 'Log in'], ['/register', 'Sign up']]), ...(user?.role === 'admin' ? [['/admin', 'Admin']] : [])];
  const Search_ = <form onSubmit={go} role="search" className="relative flex-1"><Search size={16} className="absolute left-3 top-2.5 text-stone-400" />
    <input className="input pl-9" placeholder="Search products" aria-label="Search products" value={q} onChange={(e) => setQ(e.target.value)} /></form>;
  const icon = (to, label, Icon, n) => <Link to={to} aria-label={label} className="relative p-1"><Icon size={20} />{n > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] text-white">{n}</span>}</Link>;
  return <header className="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/90 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
      <Link to="/" className="font-display text-2xl font-semibold">Threadly</Link>
      <div className="hidden max-w-md flex-1 md:flex">{Search_}</div>
      <nav className="ml-auto hidden items-center gap-5 text-sm md:flex">
        {links.map(([to, l]) => <Link key={to} to={to} className="hover:text-accent">{l}</Link>)}
        {user && <button onClick={logout} className="text-stone-500 hover:text-accent">Log out</button>}
        {icon('/wishlist', 'Wishlist', Heart, wish.length)}{icon('/cart', 'Cart', ShoppingBag, count)}
      </nav>
      <div className="ml-auto flex items-center gap-3 md:hidden">{icon('/cart', 'Cart', ShoppingBag, count)}
        <button onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button></div>
    </div>
    {open && <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-4 text-sm md:hidden" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="flex">{Search_}</div>
      {[...links, ['/wishlist', 'Wishlist']].map(([to, l]) => <Link key={to} to={to}>{l}</Link>)}
      {user && <button onClick={logout} className="text-left text-stone-500">Log out</button>}</div>}
  </header>;
}

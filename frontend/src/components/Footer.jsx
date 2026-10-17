import { Link } from 'react-router-dom';
export default function Footer() {
  return <footer className="mt-20 border-t border-stone-200 bg-white"><div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-stone-600 md:grid-cols-3">
    <div><p className="font-display text-xl text-ink">Threadly</p><p className="mt-2">A demo fashion store. Orders are recorded internally — no payment or delivery is processed.</p></div>
    <div className="flex flex-col gap-2"><Link to="/products">Shop all</Link><Link to="/wishlist">Wishlist</Link><Link to="/orders">My orders</Link></div>
    <p className="md:text-right">© {new Date().getFullYear()} Threadly</p></div></footer>;
}

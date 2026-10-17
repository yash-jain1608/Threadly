import { Link, useNavigate } from 'react-router-dom'; import { Heart, Star } from 'lucide-react'; import { useApp } from '../context/AppContext.jsx'; import { money, imgOf } from '../api.js';
export default function ProductCard({ p }) {
  const { user, wish, toggleWish } = useApp(), nav = useNavigate(), liked = wish.includes(p._id);
  const off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  return <article className="group relative">
    <Link to={`/products/${p._id}`} className="block overflow-hidden rounded-2xl bg-stone-200">
      <img src={imgOf(p)} alt={p.title} loading="lazy" className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-105" /></Link>
    <button onClick={() => (user ? toggleWish(p._id) : nav('/login'))} aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={liked}
      className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow"><Heart size={18} className={liked ? 'fill-accent text-accent' : ''} /></button>
    {p.stock === 0 && <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs text-white">Sold out</span>}
    <div className="mt-3"><Link to={`/products/${p._id}`} className="line-clamp-1 text-sm font-medium">{p.title}</Link>
      <p className="mt-1 flex items-center gap-2 text-sm"><span className="font-semibold">{money(p.price)}</span>
        {off > 0 && <><span className="text-stone-400 line-through">{money(p.mrp)}</span><span className="text-accent">{off}% off</span></>}
        {p.ratingCount > 0 && <span className="ml-auto flex items-center gap-1 text-stone-500"><Star size={13} className="fill-amber-400 text-amber-400" />{p.ratingAvg}</span>}</p></div>
  </article>;
}

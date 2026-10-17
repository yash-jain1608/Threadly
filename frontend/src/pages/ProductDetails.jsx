import { useEffect, useState } from 'react'; import { useNavigate, useParams } from 'react-router-dom'; import { Heart, Star } from 'lucide-react';
import api, { errMsg, money } from '../api.js'; import useFetch from '../hooks/useFetch.js'; import { useApp } from '../context/AppContext.jsx'; import ProductCard from '../components/ProductCard.jsx'; import Status from '../components/Status.jsx';
const Stars = ({ n }) => <span className="inline-flex" aria-label={`${n} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} className={i <= n ? 'fill-amber-400 text-amber-400' : 'text-stone-300'} />)}</span>;
export default function ProductDetails() {
  const { id } = useParams(), nav = useNavigate(), { user, wish, toggleWish, addToCart, notify } = useApp();
  const { data, loading, error } = useFetch(`/products/${id}`), revs = useFetch(`/products/${id}/reviews`);
  const [size, setSize] = useState(''), [qty, setQty] = useState(1), [pic, setPic] = useState(0), [rv, setRv] = useState({ rating: 5, comment: '' });
  const p = data?.product;
  useEffect(() => { if (!p) return; setPic(0); setSize('');
    const r = JSON.parse(localStorage.getItem('recent') || '[]').filter((x) => x._id !== p._id); localStorage.setItem('recent', JSON.stringify([p, ...r].slice(0, 8))); }, [p]);
  const needLogin = () => { if (!user) { nav('/login', { state: { from: `/products/${id}` } }); return true; } };
  const submit = async (e) => { e.preventDefault();
    try { await api.post(`/products/${p._id}/reviews`, rv); notify('Thanks for your review'); revs.reload(); setRv({ rating: 5, comment: '' }); } catch (x) { notify(errMsg(x), 'err'); } };
  return <Status loading={loading} error={error}>{p && <div className="space-y-14">
    <div className="grid gap-10 md:grid-cols-2">
      <div><img src={p.images[pic] || '/images/img-18.jpeg'} alt={p.title} className="aspect-[4/5] w-full rounded-2xl object-cover" />
        {p.images.length > 1 && <div className="mt-3 flex gap-2">{p.images.map((s, i) => <button key={s} onClick={() => setPic(i)} aria-label={`Image ${i + 1}`}><img src={s} alt="" className={`h-16 w-16 rounded-lg object-cover ${i === pic ? 'ring-2 ring-accent' : ''}`} /></button>)}</div>}</div>
      <div><p className="text-sm text-stone-500">{p.categoryId?.name}</p><h1 className="mt-1 text-3xl">{p.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm"><Stars n={Math.round(p.ratingAvg)} /><span className="text-stone-500">{p.ratingCount} review{p.ratingCount === 1 ? '' : 's'}</span></div>
        <p className="mt-4 text-2xl font-semibold">{money(p.price)} {p.mrp > p.price && <span className="ml-2 text-base font-normal text-stone-400 line-through">{money(p.mrp)}</span>}</p>
        <p className="mt-4 text-stone-600">{p.description}</p>
        {p.sizes.length > 0 && <div className="mt-6"><p className="label">Size</p><div className="flex flex-wrap gap-2">{p.sizes.map((s) =>
          <button key={s} onClick={() => setSize(s)} aria-pressed={size === s} className={`h-10 min-w-10 rounded-lg border px-3 text-sm ${size === s ? 'border-ink bg-ink text-white' : 'border-stone-300 bg-white'}`}>{s}</button>)}</div></div>}
        <p className={`mt-5 text-sm ${p.stock <= 5 ? 'text-accent' : 'text-stone-500'}`}>{p.stock === 0 ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock'}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input type="number" min="1" max={Math.max(1, p.stock)} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value || 1))} className="input w-20" aria-label="Quantity" />
          <button className="btn btn-dark flex-1" disabled={!p.stock} onClick={() => !needLogin() && (p.sizes.length && !size ? notify('Choose a size first', 'err') : addToCart(p._id, qty, size || undefined))}>Add to cart</button>
          <button className="btn btn-light" aria-label="Wishlist" onClick={() => !needLogin() && toggleWish(p._id)}><Heart size={18} className={wish.includes(p._id) ? 'fill-accent text-accent' : ''} /></button></div></div></div>
    <section><h2 className="mb-4 text-2xl">Reviews</h2>
      <Status loading={revs.loading} error={revs.error} empty={!revs.data?.items.length} emptyText="No reviews yet.">
        <ul className="space-y-4">{revs.data?.items.map((r) => <li key={r._id} className="card"><div className="flex items-center gap-3"><Stars n={r.rating} /><span className="text-sm font-medium">{r.userId?.name}</span>
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Verified purchase</span></div>{r.comment && <p className="mt-2 text-sm text-stone-600">{r.comment}</p>}</li>)}</ul></Status>
      {user && <form onSubmit={submit} className="card mt-6 max-w-xl space-y-3"><p className="font-medium">Write a review</p><p className="text-xs text-stone-500">Available to customers who have ordered this product.</p>
        <select className="input w-28" aria-label="Rating" value={rv.rating} onChange={(e) => setRv({ ...rv, rating: +e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select>
        <textarea className="input" rows="3" maxLength="1000" placeholder="Share your thoughts" value={rv.comment} onChange={(e) => setRv({ ...rv, comment: e.target.value })} /><button className="btn btn-dark">Submit review</button></form>}</section>
    {data.related.length > 0 && <section><h2 className="mb-4 text-2xl">You may also like</h2><div className="grid grid-cols-2 gap-5 md:grid-cols-4">{data.related.map((r) => <ProductCard key={r._id} p={r} />)}</div></section>}
  </div>}</Status>;
}

import { useState } from 'react'; import { Link, useNavigate, useParams } from 'react-router-dom'; import { Trash2 } from 'lucide-react';
import api, { errMsg, money, imgOf } from '../api.js'; import useFetch from '../hooks/useFetch.js'; import { useApp } from '../context/AppContext.jsx'; import ProductCard from '../components/ProductCard.jsx'; import Status from '../components/Status.jsx';

export const StatusBadge = ({ s }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${{ Placed: 'bg-amber-100 text-amber-800', Confirmed: 'bg-blue-100 text-blue-800', Completed: 'bg-green-100 text-green-800', Cancelled: 'bg-stone-200 text-stone-600' }[s]}`}>{s}</span>;

export function Cart() {
  const { cart, setQty, removeItem } = useApp();
  if (!cart.items.length) return <div className="py-20 text-center"><h1 className="text-3xl">Your cart is empty</h1><Link to="/products" className="btn btn-dark mt-6">Start shopping</Link></div>;
  const bad = cart.items.some((i) => !i.product.isActive || i.quantity > i.product.stock);
  return <div className="grid gap-8 md:grid-cols-[1fr_320px]"><div><h1 className="mb-5 text-3xl">Shopping cart</h1><ul className="space-y-4">
    {cart.items.map((i) => { const p = i.product, over = !p.isActive || i.quantity > p.stock; return <li key={i._id} className="card flex gap-4">
      <img src={imgOf(p)} alt="" className="h-28 w-24 rounded-lg object-cover" /><div className="flex-1"><Link to={`/products/${p._id}`} className="font-medium">{p.title}</Link>
        <p className="text-sm text-stone-500">{i.size && `Size ${i.size} · `}{money(p.price)}</p>
        {over && <p className="mt-1 text-sm text-red-600" role="alert">{p.isActive ? `Only ${p.stock} in stock — reduce quantity` : 'No longer available'}</p>}
        <div className="mt-3 flex items-center gap-3"><input type="number" min="1" max={p.stock} value={i.quantity} aria-label="Quantity" className="input w-20" onChange={(e) => +e.target.value >= 1 && setQty(i._id, +e.target.value)} />
          <button onClick={() => removeItem(i._id)} aria-label="Remove item" className="text-stone-400 hover:text-red-600"><Trash2 size={18} /></button></div></div>
      <p className="font-semibold">{money(i.lineTotal)}</p></li>; })}</ul></div>
    <aside className="card h-fit space-y-4"><div className="flex justify-between"><span>Subtotal</span><b>{money(cart.subtotal)}</b></div><p className="text-xs text-stone-500">Coupons are applied at checkout.</p>
      {bad ? <button className="btn btn-dark w-full" disabled>Fix cart issues to continue</button> : <Link to="/checkout" className="btn btn-dark w-full">Review order</Link>}</aside></div>;
}

export function Checkout() {
  const { cart, user, setCart, notify } = useApp(), nav = useNavigate();
  const [c, setC] = useState({ name: user.name, phone: user.phone || '', address: user.address || '', notes: '' }), [code, setCode] = useState(''), [applied, setApplied] = useState(null), [busy, setBusy] = useState(false);
  if (!cart.items.length) return <div className="py-20 text-center">Your cart is empty. <Link to="/products" className="text-accent">Shop</Link></div>;
  const on = (k) => (e) => setC({ ...c, [k]: e.target.value });
  const apply = async () => { try { setApplied((await api.post('/coupons/validate', { code })).data); notify('Coupon applied'); } catch (e) { setApplied(null); notify(errMsg(e), 'err'); } };
  const place = async (e) => { e.preventDefault(); setBusy(true);
    try { const { data } = await api.post('/orders', { contact: c, couponCode: applied?.code }); setCart({ items: [], subtotal: 0 }); nav(`/orders/${data.order._id}/confirmation`, { replace: true }); }
    catch (x) { notify(errMsg(x), 'err'); setBusy(false); api.get('/cart').then((r) => setCart(r.data)).catch(() => {}); } };
  return <form onSubmit={place} className="grid gap-8 md:grid-cols-[1fr_340px]"><div className="space-y-4"><h1 className="text-3xl">Review your order</h1>
    <div className="card grid gap-4 sm:grid-cols-2"><p className="text-xs text-stone-500 sm:col-span-2">We only collect what’s needed to record your order. No payment is taken.</p>
      <label><span className="label">Full name</span><input required className="input" value={c.name} onChange={on('name')} /></label>
      <label><span className="label">Phone</span><input required className="input" value={c.phone} onChange={on('phone')} pattern="[0-9+\-\s]{7,15}" /></label>
      <label className="sm:col-span-2"><span className="label">Address</span><textarea required minLength="8" className="input" rows="2" value={c.address} onChange={on('address')} /></label>
      <label className="sm:col-span-2"><span className="label">Notes (optional)</span><input className="input" maxLength="300" value={c.notes} onChange={on('notes')} /></label></div>
    <ul className="card divide-y divide-stone-100">{cart.items.map((i) => <li key={i._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><img src={imgOf(i.product)} alt="" className="h-14 w-12 rounded object-cover" />
      <span className="flex-1 text-sm">{i.product.title}{i.size && ` (${i.size})`} × {i.quantity}</span><span className="text-sm font-medium">{money(i.lineTotal)}</span></li>)}</ul></div>
    <aside className="card h-fit space-y-3 text-sm"><div className="flex gap-2"><input className="input" placeholder="Coupon code" aria-label="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} /><button type="button" className="btn btn-light" onClick={apply} disabled={!code}>Apply</button></div>
      <div className="flex justify-between"><span>Subtotal</span><span>{money(cart.subtotal)}</span></div>
      {applied && <div className="flex justify-between text-green-700"><span>Discount ({applied.code})</span><span>−{money(applied.discount)}</span></div>}
      <div className="flex justify-between border-t pt-3 text-base font-semibold"><span>Total</span><span>{money(applied ? applied.total : cart.subtotal)}</span></div>
      <p className="text-xs text-stone-500">Final prices and stock are re-checked when you place the order.</p><button className="btn btn-dark w-full" disabled={busy}>{busy ? 'Placing…' : 'Place order'}</button></aside></form>;
}

export function Confirmation() {
  const { id } = useParams(), { data, loading, error } = useFetch(`/orders/${id}`);
  return <Status loading={loading} error={error}>{data && <div className="mx-auto max-w-lg py-10 text-center"><h1 className="text-4xl">Order placed</h1>
    <p className="mt-3 text-stone-600">Thank you! Your order number is</p><p className="mt-1 font-mono text-xl">{data.order.orderNumber}</p>
    <p className="mt-2 text-sm text-stone-500">Total {money(data.order.total)} · recorded as “{data.order.status}”.</p>
    <div className="mt-6 flex justify-center gap-3"><Link to={`/orders/${id}`} className="btn btn-dark">View order</Link><Link to="/products" className="btn btn-light">Keep shopping</Link></div></div>}</Status>;
}

export function Orders() {
  const { data, loading, error } = useFetch('/orders');
  return <div><h1 className="mb-5 text-3xl">My orders</h1><Status loading={loading} error={error} empty={!data?.items.length} emptyText="You haven’t placed any orders yet.">
    <ul className="space-y-3">{data?.items.map((o) => <li key={o._id}><Link to={`/orders/${o._id}`} className="card flex items-center justify-between hover:border-stone-400">
      <div><p className="font-mono text-sm">{o.orderNumber}</p><p className="text-xs text-stone-500">{new Date(o.createdAt).toLocaleDateString()} · {o.items.length} item(s)</p></div>
      <div className="flex items-center gap-4"><StatusBadge s={o.status} /><b>{money(o.total)}</b></div></Link></li>)}</ul></Status></div>;
}

export function OrderDetails() {
  const { id } = useParams(), { data, loading, error, reload } = useFetch(`/orders/${id}`), { notify } = useApp(), o = data?.order;
  const cancel = async () => { if (!confirm('Cancel this order?')) return; try { await api.patch(`/orders/${id}/cancel`); notify('Order cancelled'); reload(); } catch (e) { notify(errMsg(e), 'err'); } };
  return <Status loading={loading} error={error}>{o && <div className="mx-auto max-w-2xl space-y-5"><div className="flex items-center justify-between"><h1 className="font-mono text-2xl">{o.orderNumber}</h1><StatusBadge s={o.status} /></div>
    <ul className="card divide-y divide-stone-100">{o.items.map((i, k) => <li key={k} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><img src={i.image || '/images/img-18.jpeg'} alt="" className="h-16 w-14 rounded object-cover" />
      <Link to={`/products/${i.productId}`} className="flex-1 text-sm">{i.title}{i.size && ` (${i.size})`}<br /><span className="text-stone-500">{money(i.price)} × {i.quantity}</span></Link><b>{money(i.price * i.quantity)}</b></li>)}</ul>
    <div className="card space-y-1 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>{o.discount > 0 && <div className="flex justify-between text-green-700"><span>Discount {o.couponCode}</span><span>−{money(o.discount)}</span></div>}
      <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{money(o.total)}</span></div></div>
    <div className="card text-sm"><p className="font-medium">{o.contact.name} · {o.contact.phone}</p><p className="text-stone-600">{o.contact.address}</p></div>
    {o.status === 'Placed' && <button onClick={cancel} className="btn btn-light text-red-600">Cancel order</button>}</div>}</Status>;
}

export function Wishlist() {
  const { data, loading, error } = useFetch('/wishlist'), { wish } = useApp();
  const items = data?.items.filter((p) => wish.includes(p._id));
  return <div><h1 className="mb-5 text-3xl">Wishlist</h1><Status loading={loading} error={error} empty={!items?.length} emptyText="Tap the heart on any product to save it here.">
    <div className="grid grid-cols-2 gap-5 md:grid-cols-4">{items?.map((p) => <ProductCard key={p._id} p={p} />)}</div></Status></div>;
}

export function Profile() {
  const { user, setUser, notify } = useApp(), [f, setF] = useState({ name: user.name, phone: user.phone || '', address: user.address || '' }), [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const save = async (e) => { e.preventDefault(); try { setUser((await api.patch('/users/me', f)).data.user); notify('Profile saved'); } catch (x) { notify(errMsg(x), 'err'); } };
  const change = async (e) => { e.preventDefault(); try { await api.patch('/users/me/password', pw); setPw({ currentPassword: '', newPassword: '' }); notify('Password changed'); } catch (x) { notify(errMsg(x), 'err'); } };
  return <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2"><form onSubmit={save} className="card space-y-3"><h2 className="text-xl">Profile</h2><p className="text-sm text-stone-500">{user.email}</p>
    {['name', 'phone', 'address'].map((k) => <label key={k} className="block"><span className="label">{k}</span><input className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required={k === 'name'} /></label>)}<button className="btn btn-dark">Save</button></form>
    <form onSubmit={change} className="card h-fit space-y-3"><h2 className="text-xl">Change password</h2>
      <label className="block"><span className="label">Current</span><input type="password" required className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></label>
      <label className="block"><span className="label">New</span><input type="password" required minLength="8" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></label><button className="btn btn-dark">Update</button></form></div>;
}

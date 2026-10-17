import { useState } from 'react'; import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import api, { errMsg, money } from '../../api.js'; import useFetch from '../../hooks/useFetch.js'; import { useApp } from '../../context/AppContext.jsx'; import Status from '../../components/Status.jsx'; import { StatusBadge } from '../Account.jsx';

const Table = ({ head, children }) => <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm"><thead className="border-b bg-stone-50 text-xs uppercase text-stone-500"><tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-stone-100">{children}</tbody></table></div>;
const Td = (p) => <td className="px-4 py-3" {...p} />;
const Pager = ({ d, page, setPage }) => d?.pages > 1 ? <div className="mt-4 flex items-center justify-center gap-3 text-sm"><button className="btn btn-light" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>{page} / {d.pages}<button className="btn btn-light" disabled={page >= d.pages} onClick={() => setPage(page + 1)}>Next</button></div> : null;
const useAct = () => { const { notify } = useApp(); return async (fn, ok) => { try { const r = await fn(); if (ok) notify(ok); return r ?? true; } catch (e) { notify(errMsg(e), 'err'); return false; } }; };
const Stat = ({ l, v }) => <div className="card"><p className="text-xs uppercase text-stone-500">{l}</p><p className="mt-1 text-2xl font-semibold">{v}</p></div>;

export function Dashboard({ full }) {
  const { data: d, loading, error } = useFetch('/admin/analytics/overview');
  return <div className="space-y-6"><h1 className="text-2xl">{full ? 'Analytics' : 'Overview'}</h1><p className="-mt-4 text-xs text-stone-500">Based on recorded orders (no payments are processed).</p>
    <Status loading={loading} error={error}>{d && <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5"><Stat l="Recorded revenue" v={money(d.revenue)} /><Stat l="Orders" v={d.orders} /><Stat l="Avg order" v={money(d.avgOrderValue)} /><Stat l="Customers" v={d.customers} /><Stat l="Active products" v={d.products} /></div>
      <div className="grid gap-4 lg:grid-cols-2"><div className="card"><h2 className="mb-3 text-lg">Sales — last 30 days</h2>{d.salesByDay.length ? <ResponsiveContainer width="100%" height={240}><LineChart data={d.salesByDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line dataKey="revenue" stroke="#b4442b" strokeWidth={2} /></LineChart></ResponsiveContainer> : <p className="py-10 text-center text-sm text-stone-500">No orders yet.</p>}</div>
        <div className="card"><h2 className="mb-3 text-lg">Top products (units)</h2>{d.topProducts.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={d.topProducts} layout="vertical"><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="units" fill="#1c1917" /></BarChart></ResponsiveContainer> : <p className="py-10 text-center text-sm text-stone-500">No data yet.</p>}</div></div>
      <div className="grid gap-4 lg:grid-cols-2"><div className="card"><h2 className="mb-3 text-lg">Orders by status</h2><div className="flex flex-wrap gap-3">{['Placed', 'Confirmed', 'Completed', 'Cancelled'].map((s) => <div key={s}><StatusBadge s={s} /> <b className="ml-1">{d.statusCounts[s] || 0}</b></div>)}</div></div>
        <div className="card"><h2 className="mb-3 text-lg">Low stock</h2>{d.lowStock.length ? <ul className="space-y-1 text-sm">{d.lowStock.map((p) => <li key={p._id} className="flex justify-between"><span>{p.title}</span><b className={p.stock === 0 ? 'text-red-600' : 'text-accent'}>{p.stock}</b></li>)}</ul> : <p className="text-sm text-stone-500">All stocked.</p>}</div></div></>}</Status></div>;
}

const blank = { title: '', brand: '', categoryId: '', price: '', mrp: '', stock: '', sizes: '', images: '', description: '', isActive: true };
export function AdminProducts() {
  const [page, setPage] = useState(1), [q, setQ] = useState(''), { data, loading, error, reload } = useFetch(`/admin/products?page=${page}&q=${encodeURIComponent(q)}`), cats = useFetch('/categories'), act = useAct();
  const [f, setF] = useState(null), on = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const edit = (p) => setF({ ...p, _id: p._id, categoryId: p.categoryId?._id, sizes: p.sizes.join(','), images: p.images.join(','), mrp: p.mrp || '' });
  const save = async (e) => { e.preventDefault(); const body = { title: f.title, brand: f.brand || undefined, categoryId: f.categoryId, price: +f.price, mrp: f.mrp ? +f.mrp : undefined, stock: +f.stock, description: f.description,
      sizes: f.sizes.split(',').map((s) => s.trim()).filter(Boolean), images: f.images.split(',').map((s) => s.trim()).filter(Boolean), isActive: f.isActive };
    if (await act(() => (f._id ? api.patch(`/products/${f._id}`, body) : api.post('/products', body)), 'Product saved')) { setF(null); reload(); } };
  const upload = async (e) => { const file = e.target.files[0]; if (!file) return; const fd = new FormData(); fd.append('image', file);
    const r = await act(async () => (await api.post('/uploads', fd)).data.url, 'Image uploaded'); if (r && r !== true) setF((x) => ({ ...x, images: [x.images, r].filter(Boolean).join(',') })); };
  const setActive = async (p, isActive) => { if (await act(() => (isActive ? api.patch(`/products/${p._id}`, { isActive }) : api.delete(`/products/${p._id}`)), isActive ? 'Restored' : 'Archived')) reload(); };
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl">Products</h1><div className="flex gap-2"><input className="input" placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search products" /><button className="btn btn-dark" onClick={() => setF(blank)}>New</button></div></div>
    {f && <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2"><h2 className="text-lg sm:col-span-2">{f._id ? 'Edit product' : 'New product'}</h2>
      <label><span className="label">Title</span><input required className="input" value={f.title} onChange={on('title')} /></label><label><span className="label">Brand</span><input className="input" value={f.brand || ''} onChange={on('brand')} /></label>
      <label><span className="label">Category</span><select required className="input" value={f.categoryId} onChange={on('categoryId')}><option value="">Select…</option>{cats.data?.items.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
      <label><span className="label">Sizes (comma separated)</span><input className="input" value={f.sizes} onChange={on('sizes')} /></label>
      <label><span className="label">Price</span><input required type="number" min="0" className="input" value={f.price} onChange={on('price')} /></label><label><span className="label">MRP</span><input type="number" min="0" className="input" value={f.mrp} onChange={on('mrp')} /></label>
      <label><span className="label">Stock</span><input required type="number" min="0" className="input" value={f.stock} onChange={on('stock')} /></label>
      <label><span className="label">Upload image (JPEG/PNG/WebP, ≤5MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={upload} /></label>
      <label className="sm:col-span-2"><span className="label">Image URLs (comma separated)</span><input className="input" value={f.images} onChange={on('images')} /></label>
      <label className="sm:col-span-2"><span className="label">Description</span><textarea className="input" rows="3" value={f.description} onChange={on('description')} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={on('isActive')} /> Active (visible in store)</label>
      <div className="flex gap-2 sm:col-span-2"><button className="btn btn-dark">Save</button><button type="button" className="btn btn-light" onClick={() => setF(null)}>Cancel</button></div></form>}
    <Status loading={loading} error={error} empty={!data?.items.length}><Table head={['Product', 'Category', 'Price', 'Stock', 'Status', '']}>{data?.items.map((p) => <tr key={p._id}>
      <Td><span className="flex items-center gap-3"><img src={p.images[0] || '/images/img-18.jpeg'} alt="" className="h-10 w-9 rounded object-cover" />{p.title}</span></Td><Td>{p.categoryId?.name}</Td><Td>{money(p.price)}</Td>
      <Td><span className={p.stock <= 5 ? 'font-semibold text-accent' : ''}>{p.stock}</span></Td><Td>{p.isActive ? 'Active' : 'Archived'}</Td>
      <Td><button className="mr-3 text-accent" onClick={() => edit(p)}>Edit</button><button className="text-stone-500" onClick={() => setActive(p, !p.isActive)}>{p.isActive ? 'Archive' : 'Restore'}</button></Td></tr>)}</Table><Pager d={data} page={page} setPage={setPage} /></Status></div>;
}

export function AdminCategories() {
  const { data, loading, error, reload } = useFetch('/categories'), act = useAct(), [f, setF] = useState({ name: '', image: '' });
  const add = async (e) => { e.preventDefault(); if (await act(() => api.post('/categories', { name: f.name, image: f.image || undefined }), 'Category added')) { setF({ name: '', image: '' }); reload(); } };
  const rename = async (c) => { const name = prompt('New name', c.name); if (name && await act(() => api.patch(`/categories/${c._id}`, { name }), 'Updated')) reload(); };
  const del = async (c) => { if (confirm(`Delete ${c.name}?`) && await act(() => api.delete(`/categories/${c._id}`), 'Deleted')) reload(); };
  return <div className="space-y-4"><h1 className="text-2xl">Categories</h1><form onSubmit={add} className="card flex flex-wrap gap-3"><input required className="input flex-1" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Name" />
    <input className="input flex-1" placeholder="Image URL (optional)" value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} aria-label="Image URL" /><button className="btn btn-dark">Add</button></form>
    <Status loading={loading} error={error} empty={!data?.items.length}><Table head={['Name', 'Slug', '']}>{data?.items.map((c) => <tr key={c._id}><Td>{c.name}</Td><Td>{c.slug}</Td><Td><button className="mr-3 text-accent" onClick={() => rename(c)}>Rename</button><button className="text-red-600" onClick={() => del(c)}>Delete</button></Td></tr>)}</Table></Status></div>;
}

export function AdminOrders() {
  const [page, setPage] = useState(1), [st, setSt] = useState(''), { data, loading, error, reload } = useFetch(`/admin/orders?page=${page}&status=${st}`), act = useAct();
  const NEXT = { Placed: ['Confirmed', 'Cancelled'], Confirmed: ['Completed', 'Cancelled'] };
  const change = async (o, status) => { if (await act(() => api.patch(`/admin/orders/${o._id}/status`, { status }), `Order ${status.toLowerCase()}`)) reload(); };
  return <div className="space-y-4"><div className="flex items-center justify-between"><h1 className="text-2xl">Orders</h1><select className="input w-auto" aria-label="Filter status" value={st} onChange={(e) => { setSt(e.target.value); setPage(1); }}><option value="">All</option>{['Placed', 'Confirmed', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}</select></div>
    <Status loading={loading} error={error} empty={!data?.items.length} emptyText="No orders."><Table head={['Order', 'Customer', 'Items', 'Total', 'Status', 'Action']}>{data?.items.map((o) => <tr key={o._id}>
      <Td><span className="font-mono text-xs">{o.orderNumber}</span><br /><span className="text-xs text-stone-500">{new Date(o.createdAt).toLocaleString()}</span></Td><Td>{o.userId?.name}<br /><span className="text-xs text-stone-500">{o.userId?.email}</span></Td>
      <Td>{o.items.map((i) => `${i.title} ×${i.quantity}`).join(', ')}</Td><Td>{money(o.total)}</Td><Td><StatusBadge s={o.status} /></Td>
      <Td>{(NEXT[o.status] || []).map((s) => <button key={s} onClick={() => change(o, s)} className={`mr-2 text-xs underline ${s === 'Cancelled' ? 'text-red-600' : 'text-accent'}`}>{s}</button>)}</Td></tr>)}</Table><Pager d={data} page={page} setPage={setPage} /></Status></div>;
}

export function AdminUsers() {
  const [page, setPage] = useState(1), { data, loading, error, reload } = useFetch(`/admin/users?page=${page}`), act = useAct();
  return <div className="space-y-4"><h1 className="text-2xl">Customers</h1><Status loading={loading} error={error} empty={!data?.items.length} emptyText="No customers yet."><Table head={['Name', 'Email', 'Orders', 'Spent', 'Joined', 'Active']}>{data?.items.map((u) => <tr key={u._id}>
    <Td>{u.name}</Td><Td>{u.email}</Td><Td>{u.orders}</Td><Td>{money(u.spent)}</Td><Td>{new Date(u.createdAt).toLocaleDateString()}</Td>
    <Td><input type="checkbox" aria-label={`Toggle ${u.name}`} checked={u.isActive} onChange={async (e) => { if (await act(() => api.patch(`/admin/users/${u._id}`, { isActive: e.target.checked }))) reload(); }} /></Td></tr>)}</Table><Pager d={data} page={page} setPage={setPage} /></Status></div>;
}

export function AdminCoupons() {
  const { data, loading, error, reload } = useFetch('/admin/coupons'), act = useAct(), init = { code: '', discountType: 'percent', value: 10, minSubtotal: 0, usageLimit: 0, expiry: '' }, [f, setF] = useState(init);
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = async (e) => { e.preventDefault(); if (await act(() => api.post('/admin/coupons', { ...f, value: +f.value, minSubtotal: +f.minSubtotal, usageLimit: +f.usageLimit, expiry: f.expiry || null }), 'Coupon created')) { setF(init); reload(); } };
  return <div className="space-y-4"><h1 className="text-2xl">Coupons</h1><form onSubmit={add} className="card grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
    <input required minLength="3" className="input" placeholder="CODE" aria-label="Code" value={f.code} onChange={on('code')} /><select className="input" aria-label="Type" value={f.discountType} onChange={on('discountType')}><option value="percent">Percent</option><option value="fixed">Fixed ₹</option></select>
    <input required type="number" min="1" className="input" aria-label="Value" placeholder="Value" value={f.value} onChange={on('value')} /><input type="number" min="0" className="input" aria-label="Minimum subtotal" placeholder="Min ₹" value={f.minSubtotal} onChange={on('minSubtotal')} />
    <input type="number" min="0" className="input" aria-label="Usage limit (0 = unlimited)" placeholder="Limit" value={f.usageLimit} onChange={on('usageLimit')} /><input type="date" className="input" aria-label="Expiry" value={f.expiry} onChange={on('expiry')} />
    <button className="btn btn-dark sm:col-span-3 lg:col-span-6">Create coupon</button></form>
    <Status loading={loading} error={error} empty={!data?.items.length} emptyText="No coupons."><Table head={['Code', 'Discount', 'Min', 'Used', 'Expiry', 'Active', '']}>{data?.items.map((c) => <tr key={c._id}><Td><b>{c.code}</b></Td>
      <Td>{c.discountType === 'percent' ? `${c.value}%` : money(c.value)}</Td><Td>{money(c.minSubtotal)}</Td><Td>{c.usedCount}/{c.usageLimit || '∞'}</Td><Td>{c.expiry ? new Date(c.expiry).toLocaleDateString() : '—'}</Td>
      <Td><input type="checkbox" aria-label={`Toggle ${c.code}`} checked={c.isActive} onChange={async (e) => { if (await act(() => api.patch(`/admin/coupons/${c._id}`, { isActive: e.target.checked }))) reload(); }} /></Td>
      <Td><button className="text-red-600" onClick={async () => { if (confirm('Delete coupon?') && await act(() => api.delete(`/admin/coupons/${c._id}`))) reload(); }}>Delete</button></Td></tr>)}</Table></Status></div>;
}

export function AdminReviews() {
  const { data, loading, error, reload } = useFetch('/admin/reviews'), act = useAct();
  return <div className="space-y-4"><h1 className="text-2xl">Review moderation</h1><Status loading={loading} error={error} empty={!data?.items.length} emptyText="No reviews yet."><Table head={['Product', 'User', 'Rating', 'Comment', '']}>{data?.items.map((r) => <tr key={r._id}>
    <Td>{r.productId?.title}</Td><Td>{r.userId?.name}</Td><Td>{r.rating}★</Td><Td>{r.comment}</Td>
    <Td><button className="mr-3 text-accent" onClick={async () => { if (await act(() => api.patch(`/admin/reviews/${r._id}/hide`, { hidden: !r.hidden }))) reload(); }}>{r.hidden ? 'Unhide' : 'Hide'}</button>
      <button className="text-red-600" onClick={async () => { if (confirm('Delete review?') && await act(() => api.delete(`/reviews/${r._id}`), 'Deleted')) reload(); }}>Delete</button></Td></tr>)}</Table></Status></div>;
}

import { Link, useParams, useSearchParams } from 'react-router-dom'; import useFetch from '../hooks/useFetch.js'; import ProductCard from '../components/ProductCard.jsx'; import Status from '../components/Status.jsx';
export default function Products() {
  const { slug } = useParams(), [sp, setSp] = useSearchParams(), cats = useFetch('/categories');
  const params = { limit: 12, ...Object.fromEntries(sp), ...(slug ? { category: slug } : {}) };
  const { data, loading, error } = useFetch('/products?' + new URLSearchParams(params));
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n); };
  const page = +sp.get('page') || 1;
  return <div className="grid gap-8 md:grid-cols-[220px_1fr]">
    <aside className="space-y-6 text-sm">
      <div><p className="label">Category</p><ul className="space-y-1"><li><Link to="/products" className={!slug ? 'font-semibold text-accent' : ''}>All</Link></li>
        {cats.data?.items.map((c) => <li key={c._id}><Link to={`/categories/${c.slug}`} className={slug === c.slug ? 'font-semibold text-accent' : ''}>{c.name}</Link></li>)}</ul></div>
      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); const n = new URLSearchParams(sp); ['minPrice', 'maxPrice'].forEach((k) => (f.get(k) ? n.set(k, f.get(k)) : n.delete(k))); n.delete('page'); setSp(n); }}>
        <p className="label">Price (₹)</p><div className="flex gap-2"><input name="minPrice" type="number" min="0" placeholder="Min" defaultValue={sp.get('minPrice') || ''} className="input" aria-label="Minimum price" />
          <input name="maxPrice" type="number" min="0" placeholder="Max" defaultValue={sp.get('maxPrice') || ''} className="input" aria-label="Maximum price" /></div><button className="btn btn-light mt-2 w-full">Apply</button></form>
    </aside>
    <section><div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl">{sp.get('q') ? `Results for “${sp.get('q')}”` : slug ? cats.data?.items.find((c) => c.slug === slug)?.name || 'Category' : 'All products'}{data && <span className="ml-2 text-sm text-stone-500">({data.total})</span>}</h1>
      <select className="input w-auto" aria-label="Sort" value={sp.get('sort') || 'newest'} onChange={(e) => set('sort', e.target.value)}>
        <option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating">Top rated</option></select></div>
      <Status loading={loading} error={error} empty={data && !data.items.length} emptyText="No products match your filters.">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">{data?.items.map((p) => <ProductCard key={p._id} p={p} />)}</div>
        {data?.pages > 1 && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
          <button className="btn btn-light" disabled={page <= 1} onClick={() => set('page', page - 1)}>Previous</button><span className="text-sm">Page {page} of {data.pages}</span>
          <button className="btn btn-light" disabled={page >= data.pages} onClick={() => set('page', page + 1)}>Next</button></nav>}
      </Status></section></div>;
}

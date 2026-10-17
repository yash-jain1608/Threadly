import { Link } from 'react-router-dom'; import useFetch from '../hooks/useFetch.js'; import ProductCard from '../components/ProductCard.jsx'; import Status from '../components/Status.jsx';
export default function Home() {
  const cats = useFetch('/categories'), feat = useFetch('/products?sort=rating&limit=8');
  const recent = JSON.parse(localStorage.getItem('recent') || '[]');
  return <div className="space-y-16">
    <section className="grid items-center gap-8 md:grid-cols-2">
      <div><p className="text-sm uppercase tracking-widest text-accent">New season edit</p>
        <h1 className="mt-3 text-5xl font-semibold leading-tight md:text-6xl">Wardrobe pieces you’ll actually reach for.</h1>
        <p className="mt-4 max-w-md text-stone-600">Menswear, footwear, ethnic wear, accessories and more — curated and easy to shop.</p>
        <Link to="/products" className="btn btn-dark mt-6">Shop the collection</Link></div>
      <div className="grid grid-cols-3 gap-3">{[16, 18, 21].map((n, i) => <img key={n} src={`/images/img-${n}.jpeg`} alt="" className={`aspect-[3/5] w-full rounded-2xl object-cover ${i === 1 ? 'mt-8' : ''}`} />)}</div>
    </section>
    <section><h2 className="mb-5 text-2xl">Shop by category</h2>
      <Status loading={cats.loading} error={cats.error}><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cats.data?.items.map((c) => <Link key={c._id} to={`/categories/${c.slug}`} className="group relative overflow-hidden rounded-2xl bg-stone-200">
          <img src={c.image} alt="" className="aspect-square w-full object-cover transition group-hover:scale-105" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-3 pt-8 text-sm font-medium text-white">{c.name}</span></Link>)}</div></Status></section>
    <section><div className="mb-5 flex items-end justify-between"><h2 className="text-2xl">Featured</h2><Link to="/products" className="text-sm text-accent">View all</Link></div>
      <Status loading={feat.loading} error={feat.error} empty={!feat.data?.items.length} emptyText="No products yet. Run the seed script."><div className="grid grid-cols-2 gap-5 md:grid-cols-4">{feat.data?.items.map((p) => <ProductCard key={p._id} p={p} />)}</div></Status></section>
    {recent.length > 0 && <section><h2 className="mb-5 text-2xl">Recently viewed</h2><div className="grid grid-cols-2 gap-5 md:grid-cols-4">{recent.slice(0, 4).map((p) => <ProductCard key={p._id} p={p} />)}</div></section>}
  </div>;
}

export default function Status({ loading, error, empty, emptyText = 'Nothing here yet.', children }) {
  if (loading) return <div className="py-16 text-center text-stone-500" role="status">Loading…</div>;
  if (error) return <div className="my-8 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>;
  if (empty) return <div className="py-16 text-center text-stone-500">{emptyText}</div>;
  return children;
}

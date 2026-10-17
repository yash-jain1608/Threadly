import { Navigate, useLocation } from 'react-router-dom'; import { useApp } from '../context/AppContext.jsx';
export default function ProtectedRoute({ role, guest, children }) {
  const { user, ready } = useApp(); const loc = useLocation();
  if (!ready) return <div className="p-16 text-center text-stone-500">Loading…</div>;
  if (guest) return user ? <Navigate to="/" replace /> : children;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

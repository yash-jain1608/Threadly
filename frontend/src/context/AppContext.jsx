import { createContext, useCallback, useContext, useEffect, useState } from 'react'; import api, { errMsg } from '../api.js';
const Ctx = createContext(); export const useApp = () => useContext(Ctx);
const EMPTY = { items: [], subtotal: 0 };
export function AppProvider({ children }) {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false), [cart, setCart] = useState(EMPTY), [wish, setWish] = useState([]), [toast, setToast] = useState(null);
  const notify = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };
  const loadShop = useCallback(async () => {
    try { const [c, w] = await Promise.all([api.get('/cart'), api.get('/wishlist')]); setCart(c.data); setWish(w.data.items.map((p) => p._id)); } catch { /* ignore */ }
  }, []);
  useEffect(() => { (async () => {
    if (localStorage.getItem('token')) { try { setUser((await api.get('/auth/me')).data.user); await loadShop(); } catch { localStorage.removeItem('token'); } }
    setReady(true); })(); }, [loadShop]);
  const session = async (path, body) => { const { data } = await api.post(path, body); localStorage.setItem('token', data.token); setUser(data.user); await loadShop(); return data.user; };
  const logout = () => { api.post('/auth/logout').catch(() => {}); localStorage.removeItem('token'); setUser(null); setCart(EMPTY); setWish([]); };
  const run = async (fn, okMsg) => { try { const r = await fn(); if (okMsg) notify(okMsg); return r; } catch (e) { notify(errMsg(e), 'err'); return null; } };
  const addToCart = (productId, quantity = 1, size) => run(async () => { setCart((await api.post('/cart/items', { productId, quantity, size })).data); return true; }, 'Added to cart');
  const setQty = (id, quantity) => run(async () => setCart((await api.patch(`/cart/items/${id}`, { quantity })).data));
  const removeItem = (id) => run(async () => setCart((await api.delete(`/cart/items/${id}`)).data));
  const toggleWish = (productId) => run(async () => {
    if (wish.includes(productId)) { await api.delete(`/wishlist/items/${productId}`); setWish(wish.filter((x) => x !== productId)); }
    else { await api.post('/wishlist/items', { productId }); setWish([...wish, productId]); }
  });
  const value = { user, setUser, ready, cart, setCart, wish, setWish, notify, session, logout, addToCart, setQty, removeItem, toggleWish };
  return <Ctx.Provider value={value}>{children}
    {toast && <div role="status" className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm text-white shadow-lg ${toast.type === 'err' ? 'bg-red-600' : 'bg-ink'}`}>{toast.msg}</div>}</Ctx.Provider>;
}

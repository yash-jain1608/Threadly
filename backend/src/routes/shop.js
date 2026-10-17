import { Router } from 'express';
import { z } from 'zod';
import { Cart, Wishlist, Product, Order, Coupon } from '../models/index.js';
import { auth, wrap, validate, HttpError } from '../middleware/index.js';
import { round, applyCoupon, cancelOrder } from '../services/index.js';

const r = Router();
r.use(['/cart', '/wishlist', '/orders', '/coupons'], auth);
const oid = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

const view = async (userId) => {
  const c = await Cart.findOne({ userId }).populate('items.productId', 'title price images stock isActive sizes');
  const items = (c?.items || []).filter((i) => i.productId).map((i) => ({
    _id: i._id, product: i.productId, quantity: i.quantity, size: i.size, lineTotal: round(i.productId.price * i.quantity) }));
  return { items, subtotal: round(items.reduce((s, i) => s + i.lineTotal, 0)) };
};

// Cart
r.get('/cart', wrap(async (req, res) => res.json(await view(req.user._id))));
r.post('/cart/items', validate(z.object({ productId: oid, quantity: z.number().int().min(1).max(20).default(1), size: z.string().max(10).optional() })),
  wrap(async (req, res) => {
    const { productId, quantity, size } = req.body;
    const p = await Product.findOne({ _id: productId, isActive: true });
    if (!p) throw new HttpError(404, 'Product is unavailable');
    if (p.sizes.length && !p.sizes.includes(size)) throw new HttpError(400, 'Please choose a size');
    const cart = (await Cart.findOne({ userId: req.user._id })) || (await Cart.create({ userId: req.user._id }));
    const it = cart.items.find((i) => String(i.productId) === productId && i.size === size);
    const total = (it?.quantity || 0) + quantity;
    if (total > p.stock) throw new HttpError(400, p.stock ? `Only ${p.stock} left in stock` : 'Out of stock');
    if (it) it.quantity = total; else cart.items.push({ productId, quantity, size });
    await cart.save(); res.status(201).json(await view(req.user._id));
  }));
r.patch('/cart/items/:itemId', validate(z.object({ quantity: z.number().int().min(1).max(20) })), wrap(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id }); const it = cart?.items.id(req.params.itemId);
  if (!it) throw new HttpError(404, 'Cart item not found');
  const p = await Product.findOne({ _id: it.productId, isActive: true });
  if (!p) throw new HttpError(409, 'Product is no longer available');
  if (req.body.quantity > p.stock) throw new HttpError(400, `Only ${p.stock} left in stock`);
  it.quantity = req.body.quantity; await cart.save(); res.json(await view(req.user._id));
}));
r.delete('/cart/items/:itemId', wrap(async (req, res) => {
  await Cart.updateOne({ userId: req.user._id }, { $pull: { items: { _id: req.params.itemId } } }); res.json(await view(req.user._id));
}));

// Wishlist
r.get('/wishlist', wrap(async (req, res) => {
  const w = await Wishlist.findOne({ userId: req.user._id }).populate({ path: 'productIds', match: { isActive: true } });
  res.json({ items: w?.productIds || [] });
}));
r.post('/wishlist/items', validate(z.object({ productId: oid })), wrap(async (req, res) => {
  if (!(await Product.exists({ _id: req.body.productId, isActive: true }))) throw new HttpError(404, 'Product is unavailable');
  await Wishlist.updateOne({ userId: req.user._id }, { $addToSet: { productIds: req.body.productId } }, { upsert: true });
  res.status(201).json({ message: 'Added' });
}));
r.delete('/wishlist/items/:productId', wrap(async (req, res) => {
  await Wishlist.updateOne({ userId: req.user._id }, { $pull: { productIds: req.params.productId } }); res.json({ message: 'Removed' });
}));

// Coupons: discount is always computed server-side from the saved cart
r.post('/coupons/validate', validate(z.object({ code: z.string().min(1).max(30) })), wrap(async (req, res) => {
  const { subtotal } = await view(req.user._id);
  const { coupon, discount } = await applyCoupon(req.body.code, subtotal);
  res.json({ code: coupon.code, discount, subtotal, total: round(subtotal - discount) });
}));

// Orders (no payment, no delivery)
const orderSchema = z.object({
  contact: z.object({ name: z.string().min(2).max(80), phone: z.string().regex(/^[0-9+\-\s]{7,15}$/, 'invalid phone'),
    address: z.string().min(8).max(300), notes: z.string().max(300).optional() }),
  couponCode: z.string().max(30).optional(),
});
r.post('/orders', validate(orderSchema), wrap(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart?.items.length) throw new HttpError(400, 'Your cart is empty');
  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.productId) } });
  const map = new Map(products.map((p) => [String(p._id), p]));
  const taken = []; let couponId;
  const rollback = async () => {
    if (taken.length) await Product.bulkWrite(taken.map((t) => ({ updateOne: { filter: { _id: t.id }, update: { $inc: { stock: t.qty } } } })));
    if (couponId) await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: -1 } });
  };
  try {
    const items = [];
    for (const ci of cart.items) {
      const p = map.get(String(ci.productId));
      if (!p || !p.isActive) throw new HttpError(409, `"${p?.title || 'An item'}" is no longer available`);
      // Atomic guard: decrement only if enough stock remains, so concurrent orders can never oversell
      const ok = await Product.updateOne({ _id: p._id, isActive: true, stock: { $gte: ci.quantity } }, { $inc: { stock: -ci.quantity } });
      if (!ok.modifiedCount) throw new HttpError(409, `Not enough stock for "${p.title}"`);
      taken.push({ id: p._id, qty: ci.quantity });
      items.push({ productId: p._id, title: p.title, image: p.images[0], price: p.price, quantity: ci.quantity, size: ci.size });
    }
    const subtotal = round(items.reduce((s, i) => s + i.price * i.quantity, 0));
    const { coupon, discount } = await applyCoupon(req.body.couponCode, subtotal);
    if (coupon) {
      const ok = await Coupon.updateOne({ _id: coupon._id, $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] }, { $inc: { usedCount: 1 } });
      if (!ok.modifiedCount) throw new HttpError(400, 'Coupon usage limit reached');
      couponId = coupon._id;
    }
    const order = await Order.create({
      orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      userId: req.user._id, items, subtotal, discount, total: round(subtotal - discount), couponCode: coupon?.code, contact: req.body.contact });
    await Cart.updateOne({ _id: cart._id }, { items: [] });
    res.status(201).json({ order });
  } catch (e) { await rollback(); throw e; }
}));
r.get('/orders', wrap(async (req, res) => res.json({ items: await Order.find({ userId: req.user._id }).sort('-createdAt').limit(100) })));
r.get('/orders/:id', wrap(async (req, res) => {
  const o = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!o) throw new HttpError(404, 'Order not found'); res.json({ order: o });
}));
r.patch('/orders/:id/cancel', wrap(async (req, res) => { // customers may cancel only while the order is still "Placed"
  const o = await cancelOrder({ _id: req.params.id, userId: req.user._id }, ['Placed']);
  if (o) return res.json({ order: o });
  if (!(await Order.exists({ _id: req.params.id, userId: req.user._id }))) throw new HttpError(404, 'Order not found');
  throw new HttpError(400, 'This order can no longer be cancelled');
}));
export default r;

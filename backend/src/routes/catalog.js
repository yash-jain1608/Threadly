import { Router } from 'express';
import { z } from 'zod'; import multer from 'multer'; import { v2 as cloudinary } from 'cloudinary';
import { Product, Category, Review, Order } from '../models/index.js';
import { auth, admin, wrap, validate, HttpError } from '../middleware/index.js';
import { recalcRating } from '../services/index.js';

const r = Router();
const isId = (s) => /^[a-f0-9]{24}$/i.test(String(s));
const oid = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const productSchema = z.object({
  title: z.string().min(2).max(120), description: z.string().max(4000).default(''), brand: z.string().max(60).optional(),
  price: z.number().min(0), mrp: z.number().min(0).optional(), images: z.array(z.string().max(500)).max(8).default([]),
  sizes: z.array(z.string().max(10)).default([]), categoryId: oid, stock: z.number().int().min(0), isActive: z.boolean().optional(),
});

r.get('/products', wrap(async (req, res) => {
  const { q, category, minPrice, maxPrice, sort = 'newest' } = req.query;
  const page = Math.max(1, +req.query.page || 1), limit = Math.min(48, Math.max(1, +req.query.limit || 12));
  const f = { isActive: true };
  if (q) { const rx = new RegExp(esc(q), 'i'); f.$or = [{ title: rx }, { brand: rx }, { description: rx }]; }
  if (category) {
    const c = await Category.findOne(isId(category) ? { _id: category } : { slug: category });
    if (!c) return res.json({ items: [], total: 0, page, pages: 0 });
    const kids = await Category.find({ parentCategoryId: c._id }).distinct('_id');
    f.categoryId = { $in: [c._id, ...kids] };
  }
  if (minPrice || maxPrice) f.price = { ...(minPrice && { $gte: +minPrice }), ...(maxPrice && { $lte: +maxPrice }) };
  const sorts = { newest: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 }, rating: { ratingAvg: -1, ratingCount: -1 }, popular: { ratingCount: -1 } };
  const [items, total] = await Promise.all([
    Product.find(f).populate('categoryId', 'name slug').sort(sorts[sort] || sorts.newest).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(f)]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

r.get('/products/:id', wrap(async (req, res) => {
  const p = await Product.findOne({ ...(isId(req.params.id) ? { _id: req.params.id } : { slug: req.params.id }), isActive: true }).populate('categoryId', 'name slug');
  if (!p) throw new HttpError(404, 'Product not found');
  const related = await Product.find({ categoryId: p.categoryId._id, _id: { $ne: p._id }, isActive: true }).limit(4);
  res.json({ product: p, related });
}));

r.post('/products', auth, admin, validate(productSchema), wrap(async (req, res) => {
  if (!(await Category.exists({ _id: req.body.categoryId }))) throw new HttpError(400, 'Category does not exist');
  res.status(201).json({ product: await Product.create(req.body) });
}));
r.patch('/products/:id', auth, admin, validate(productSchema.partial()), wrap(async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!p) throw new HttpError(404, 'Product not found'); res.json({ product: p });
}));
r.delete('/products/:id', auth, admin, wrap(async (req, res) => { // archive, so order history stays intact
  const p = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!p) throw new HttpError(404, 'Product not found'); res.json({ product: p });
}));

// Categories
const catSchema = z.object({ name: z.string().min(2).max(60), image: z.string().max(500).optional(), parentCategoryId: oid.nullable().optional() });
r.get('/categories', wrap(async (req, res) => res.json({ items: await Category.find().sort('name') })));
r.post('/categories', auth, admin, validate(catSchema), wrap(async (req, res) => res.status(201).json({ category: await Category.create(req.body) })));
r.patch('/categories/:id', auth, admin, validate(catSchema.partial()), wrap(async (req, res) => {
  const c = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!c) throw new HttpError(404, 'Category not found'); res.json({ category: c });
}));
r.delete('/categories/:id', auth, admin, wrap(async (req, res) => {
  if (await Product.exists({ categoryId: req.params.id })) throw new HttpError(409, 'Category still has products');
  await Category.deleteOne({ _id: req.params.id }); res.json({ message: 'Deleted' });
}));

// Reviews
r.get('/products/:id/reviews', wrap(async (req, res) =>
  res.json({ items: await Review.find({ productId: req.params.id, hidden: false }).populate('userId', 'name').sort('-createdAt').limit(100) })));
const revSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).default('') });
r.post('/products/:id/reviews', auth, validate(revSchema), wrap(async (req, res) => {
  const verified = await Order.exists({ userId: req.user._id, 'items.productId': req.params.id, status: { $ne: 'Cancelled' } });
  if (!verified) throw new HttpError(403, 'Only customers who ordered this product can review it');
  if (await Review.exists({ userId: req.user._id, productId: req.params.id })) throw new HttpError(409, 'You have already reviewed this product');
  const rv = await Review.create({ ...req.body, userId: req.user._id, productId: req.params.id });
  await recalcRating(rv.productId); res.status(201).json({ review: rv });
}));
r.patch('/reviews/:id', auth, validate(revSchema.partial()), wrap(async (req, res) => {
  const rv = await Review.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true });
  if (!rv) throw new HttpError(404, 'Review not found'); await recalcRating(rv.productId); res.json({ review: rv });
}));
r.delete('/reviews/:id', auth, wrap(async (req, res) => {
  const rv = await Review.findOneAndDelete({ _id: req.params.id, ...(req.user.role === 'admin' ? {} : { userId: req.user._id }) });
  if (!rv) throw new HttpError(404, 'Review not found'); await recalcRating(rv.productId); res.json({ message: 'Deleted' });
}));

// Image upload (Cloudinary) - type and size limits enforced
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (q, f, cb) => (['image/jpeg', 'image/png', 'image/webp'].includes(f.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Only JPEG, PNG or WebP images are allowed'))) });
r.post('/uploads', auth, admin, upload.single('image'), wrap(async (req, res) => {
  if (!process.env.CLOUDINARY_URL) throw new HttpError(503, 'Cloudinary is not configured (set CLOUDINARY_URL)');
  if (!req.file) throw new HttpError(400, 'No image provided');
  const out = await new Promise((ok, no) => cloudinary.uploader.upload_stream(
    { folder: 'threadly', transformation: [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] }, (e, x) => (e ? no(e) : ok(x))).end(req.file.buffer));
  res.status(201).json({ url: out.secure_url });
}));
export default r;

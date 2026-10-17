import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const ref = (to, extra = {}) => ({ type: Schema.Types.ObjectId, ref: to, ...extra });
export const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  isActive: { type: Boolean, default: true },
  phone: String, address: String,
  resetTokenHash: { type: String, select: false }, resetExpires: { type: Date, select: false },
}, { timestamps: true }));

const cat = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, unique: true }, image: String,
  parentCategoryId: ref('Category', { default: null }),
}, { timestamps: true });
cat.pre('validate', function () { if (!this.slug) this.slug = slugify(this.name); });
export const Category = model('Category', cat);

const prod = new Schema({
  title: { type: String, required: true, trim: true }, slug: { type: String, unique: true },
  description: { type: String, default: '' }, brand: String,
  price: { type: Number, required: true, min: 0 }, mrp: { type: Number, min: 0 },
  images: [String], sizes: [String],
  categoryId: ref('Category', { required: true, index: true }),
  stock: { type: Number, required: true, min: 0, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  ratingAvg: { type: Number, default: 0 }, ratingCount: { type: Number, default: 0 },
}, { timestamps: true });
prod.index({ price: 1 }); prod.index({ createdAt: -1 });
prod.pre('validate', function () { if (!this.slug) this.slug = `${slugify(this.title)}-${Math.random().toString(36).slice(2, 6)}`; });
export const Product = model('Product', prod);

export const Cart = model('Cart', new Schema({
  userId: ref('User', { required: true, unique: true }),
  items: [{ productId: ref('Product', { required: true }), quantity: { type: Number, min: 1, required: true }, size: String }],
}, { timestamps: true }));

export const Wishlist = model('Wishlist', new Schema({
  userId: ref('User', { required: true, unique: true }), productIds: [ref('Product')],
}));

export const Order = model('Order', new Schema({
  orderNumber: { type: String, unique: true, required: true },
  userId: ref('User', { required: true, index: true }),
  items: [{ productId: ref('Product'), title: String, image: String, price: Number, quantity: Number, size: String }], // snapshots
  subtotal: Number, discount: { type: Number, default: 0 }, total: Number, couponCode: String,
  status: { type: String, enum: ['Placed', 'Confirmed', 'Completed', 'Cancelled'], default: 'Placed', index: true },
  contact: { name: String, phone: String, address: String, notes: String },
  stockRestored: { type: Boolean, default: false },
}, { timestamps: true }));

const rev = new Schema({
  userId: ref('User', { required: true }), productId: ref('Product', { required: true, index: true }),
  rating: { type: Number, min: 1, max: 5, required: true }, comment: { type: String, maxlength: 1000, default: '' },
  hidden: { type: Boolean, default: false },
}, { timestamps: true });
rev.index({ userId: 1, productId: 1 }, { unique: true });
export const Review = model('Review', rev);

export const Coupon = model('Coupon', new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 1 }, minSubtotal: { type: Number, default: 0 },
  expiry: Date, usageLimit: { type: Number, default: 0 }, usedCount: { type: Number, default: 0 }, // 0 = unlimited
  isActive: { type: Boolean, default: true },
}, { timestamps: true }));

import 'dotenv/config';
import mongoose from 'mongoose'; import bcrypt from 'bcryptjs';
import { User, Category, Product, Cart, Wishlist, Order, Review, Coupon } from './models/index.js';

const img = (n) => `/images/img-${String(n).padStart(2, '0')}.jpeg`;
const cats = { Menswear: 3, Footwear: 9, 'Ethnic Wear': 16, Workwear: 15, Jewellery: 17, Handbags: 18, Sleepwear: 19, Innerwear: 5, 'Home Decor': 20 };
const S = ['S', 'M', 'L', 'XL'], SH = ['6', '7', '8', '9', '10'];
// [title, category, price, mrp, image, sizes, stock]
const items = [
  ['Suede Lace-Up Casual Shoes', 'Footwear', 2499, 3499, 2, SH, 24], ['Colourblock Polo & Checked Shirt Set', 'Menswear', 1799, 2999, 3, S, 30],
  ['Relaxed Graphic Tee', 'Menswear', 999, 1599, 4, S, 40], ['Cotton Innerwear Set', 'Innerwear', 599, 999, 5, S, 60],
  ['Block-Heel Strappy Sandals', 'Footwear', 1899, 2999, 6, SH, 18], ['Linen-Blend Casual Shirt', 'Menswear', 1399, 2499, 7, S, 35],
  ['Colourblock Zip Jacket', 'Menswear', 3299, 5499, 8, S, 12], ['Chunky Leather Sneakers', 'Footwear', 3999, 6999, 9, SH, 15],
  ['Printed Statement Tee', 'Menswear', 1299, 1999, 10, S, 28], ['Denim Co-ord Set', 'Menswear', 2799, 4599, 11, S, 9],
  ['Strappy Stiletto Heels', 'Footwear', 2299, 3799, 12, SH, 14], ['Printed Kitten-Heel Mules', 'Footwear', 1599, 2599, 13, SH, 3],
  ['Classic Crew-Neck Tee', 'Menswear', 799, 1299, 14, S, 55], ['Textured Tailored Blazer', 'Workwear', 5499, 8999, 15, S, 10],
  ['Festive Kurta Set', 'Ethnic Wear', 2999, 5999, 16, S, 22], ['Oxidised Jhumka Earrings', 'Jewellery', 899, 1799, 17, [], 45],
  ['Slouchy Leather Handbag', 'Handbags', 3499, 5999, 18, [], 11], ['Satin Slip Night Dress', 'Sleepwear', 1199, 2199, 19, S, 26],
  ['Statement Home Decor Set', 'Home Decor', 2499, 4499, 20, [], 16], ['Retro Running Sneakers', 'Footwear', 2799, 4499, 21, SH, 20],
];

await mongoose.connect(process.env.MONGODB_URI);
await Promise.all([User, Category, Product, Cart, Wishlist, Order, Review, Coupon].map((m) => m.deleteMany({})));
const hash = (p) => bcrypt.hash(p, 12);
await User.create([
  { name: 'Store Admin', email: 'admin@threadly.test', passwordHash: await hash('Admin@123'), role: 'admin' },
  { name: 'Demo Customer', email: 'customer@threadly.test', passwordHash: await hash('Customer@123') },
]);
const c = Object.fromEntries((await Category.create(Object.entries(cats).map(([name, i]) => ({ name, image: img(i) })))).map((x) => [x.name, x._id]));
await Product.create(items.map(([title, cat, price, mrp, i, sizes, stock]) => ({
  title, categoryId: c[cat], price, mrp, images: [img(i)], sizes, stock, brand: 'Threadly',
  description: `${title}: a wardrobe staple from the Threadly edit. Comfortable, easy to style and made to last.` })));
await Coupon.create([{ code: 'WELCOME10', discountType: 'percent', value: 10 }, { code: 'FLAT300', discountType: 'fixed', value: 300, minSubtotal: 2000 }]);
console.log('Seeded. Admin: admin@threadly.test / Admin@123   Customer: customer@threadly.test / Customer@123');
await mongoose.disconnect();

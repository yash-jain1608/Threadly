# Threadly — MERN e-commerce (no payments, no delivery)

Storefront, admin dashboard, auth, cart, wishlist, internal orders, reviews and analytics.
React + Vite + Tailwind 4 · Express · MongoDB/Mongoose · JWT · Cloudinary · Recharts · Vitest/Supertest.

## Run locally
```bash
# backend
cd backend && cp .env.example .env   # fill MONGODB_URI, JWT_SECRET (CLOUDINARY_URL optional)
npm install && npm run seed && npm run dev      # http://localhost:5000
# frontend
cd frontend && npm install && npm run dev       # http://localhost:5173 (proxies /api)
```
Seed logins: `admin@threadly.test / Admin@123` · `customer@threadly.test / Customer@123`
Seed coupons: `WELCOME10` (10%), `FLAT300` (₹300 off ≥ ₹2000).

## Tests
`cd backend && npm test` (auth/validation guards, no DB needed) · `cd frontend && npm test`
For Postman: import the endpoint list below; send `Authorization: Bearer <token>`.

## Key design rules
- Prices, discounts and totals are computed on the backend only; orders store title/price snapshots.
- Stock is decremented atomically (`updateOne` with `stock: {$gte: qty}`), rolled back on any failure.
- Cancellation flips status + `stockRestored` in one atomic update, so stock is restored at most once.
- Customer can cancel only while `Placed`. Admin transitions: Placed→Confirmed|Cancelled, Confirmed→Completed|Cancelled.
- Role is never accepted from request bodies. Reviews require a non-cancelled order containing the product.
- Password reset: no email provider is wired; in dev the token is returned by `/auth/forgot-password`, in production it is logged.

## Deploy
Backend → Render (root `backend`, start `npm start`, env: MONGODB_URI, JWT_SECRET, CLIENT_URL=<vercel url>, CLOUDINARY_URL, NODE_ENV=production).
Frontend → Vercel (root `frontend`, env `VITE_API_URL=https://<render-app>/api`; `vercel.json` handles SPA routing).
Product images in the seed are served from `frontend/public/images`; replace with Cloudinary uploads via Admin → Products.

## API
Auth: POST /api/auth/{register,login,logout,forgot-password,reset-password}, GET /api/auth/me, PATCH /api/users/me, PATCH /api/users/me/password
Catalog: GET /api/products(?q,category,minPrice,maxPrice,sort,page,limit), GET /api/products/:id, POST/PATCH/DELETE (admin), /api/categories, POST /api/uploads (admin)
Shop: /api/cart, /api/cart/items[/:itemId], /api/wishlist, /api/wishlist/items[/:productId], POST /api/coupons/validate
Orders: POST/GET /api/orders, GET /api/orders/:id, PATCH /api/orders/:id/cancel
Reviews: GET/POST /api/products/:id/reviews, PATCH/DELETE /api/reviews/:id
Admin: /api/admin/{products,orders,orders/:id/status,users,coupons,reviews,analytics/overview}

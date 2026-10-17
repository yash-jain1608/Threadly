import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const auth = wrap(async (req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) throw new HttpError(401, 'Authentication required');
  let p; try { p = jwt.verify(token, process.env.JWT_SECRET); } catch { throw new HttpError(401, 'Invalid or expired token'); }
  const user = await User.findById(p.id);
  if (!user || !user.isActive) throw new HttpError(401, 'Account unavailable');
  req.user = user; next();
});
export const admin = (req, res, next) => (req.user?.role === 'admin' ? next() : next(new HttpError(403, 'Admin access required')));

export const validate = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return next(new HttpError(400, r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')));
  req.body = r.data; next();
};

export const errorHandler = (err, req, res, next) => { // eslint-disable-line
  let status = err.status || 500, message = err.message;
  if (err.name === 'ValidationError' || err.name === 'MulterError') status = 400;
  else if (err.name === 'CastError') { status = 400; message = 'Invalid id'; }
  else if (err.code === 11000) { status = 409; message = `Already exists: ${Object.keys(err.keyValue || {}).join(', ')}`; }
  if (status === 500) { console.error(err); if (process.env.NODE_ENV === 'production') message = 'Server error'; }
  res.status(status).json({ message });
};

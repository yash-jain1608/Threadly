import { Router } from 'express';
import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import crypto from 'crypto'; import { z } from 'zod';
import { User } from '../models/index.js';
import { auth, wrap, validate, HttpError } from '../middleware/index.js';

export const authRouter = Router(), userRouter = Router();
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, address: u.address });
const pw = z.string().min(8).max(72).regex(/[A-Za-z]/, 'must contain a letter').regex(/\d/, 'must contain a number');
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

authRouter.post('/register', validate(z.object({ name: z.string().min(2).max(60), email: z.string().email(), password: pw })),
  wrap(async (req, res) => { // role is never read from the body, so customers cannot self-promote
    const { name, email, password } = req.body;
    if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'Email already registered');
    const u = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: sign(u), user: pub(u) });
  }));

authRouter.post('/login', validate(z.object({ email: z.string().email(), password: z.string().min(1) })),
  wrap(async (req, res) => {
    const u = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
    if (!u || !(await bcrypt.compare(req.body.password, u.passwordHash))) throw new HttpError(401, 'Incorrect email or password');
    if (!u.isActive) throw new HttpError(403, 'This account has been disabled');
    res.json({ token: sign(u), user: pub(u) });
  }));

authRouter.post('/logout', (req, res) => res.json({ message: 'Logged out' })); // stateless JWT: client discards the token
authRouter.get('/me', auth, (req, res) => res.json({ user: pub(req.user) }));

authRouter.post('/forgot-password', validate(z.object({ email: z.string().email() })), wrap(async (req, res) => {
  const u = await User.findOne({ email: req.body.email.toLowerCase() });
  const out = { message: 'If that email exists, a reset link has been generated.' };
  if (u) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ _id: u._id }, { resetTokenHash: sha(token), resetExpires: new Date(Date.now() + 30 * 60 * 1000) });
    // No email provider is wired up: in development the token is returned so the flow can be tested end to end.
    if (process.env.NODE_ENV !== 'production') out.devResetToken = token; else console.log(`[reset] ${u.email}: ${token}`);
  }
  res.json(out);
}));
authRouter.post('/reset-password', validate(z.object({ token: z.string().min(10), password: pw })), wrap(async (req, res) => {
  const u = await User.findOneAndUpdate({ resetTokenHash: sha(req.body.token), resetExpires: { $gt: new Date() } },
    { passwordHash: await bcrypt.hash(req.body.password, 12), $unset: { resetTokenHash: 1, resetExpires: 1 } });
  if (!u) throw new HttpError(400, 'Reset link is invalid or expired');
  res.json({ message: 'Password updated' });
}));

userRouter.use(auth);
userRouter.patch('/me', validate(z.object({ name: z.string().min(2).max(60).optional(), phone: z.string().max(20).optional(), address: z.string().max(300).optional() })),
  wrap(async (req, res) => { Object.assign(req.user, req.body); await req.user.save(); res.json({ user: pub(req.user) }); }));
userRouter.patch('/me/password', validate(z.object({ currentPassword: z.string(), newPassword: pw })), wrap(async (req, res) => {
  const u = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, u.passwordHash))) throw new HttpError(400, 'Current password is incorrect');
  u.passwordHash = await bcrypt.hash(req.body.newPassword, 12); await u.save();
  res.json({ message: 'Password changed' });
}));

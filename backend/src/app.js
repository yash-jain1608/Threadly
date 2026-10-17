import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import morgan from 'morgan'; import rateLimit from 'express-rate-limit';
import { errorHandler, HttpError } from './middleware/index.js';
import { authRouter, userRouter } from './routes/auth.js'; import catalog from './routes/catalog.js'; import shop from './routes/shop.js'; import adminRouter from './routes/admin.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter); app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api', catalog); app.use('/api', shop);
app.use((req, res, next) => next(new HttpError(404, 'Route not found')));
app.use(errorHandler);
export default app;

import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
for (const k of ['MONGODB_URI', 'JWT_SECRET']) if (!process.env[k]) { console.error(`Missing env var ${k}`); process.exit(1); }
await mongoose.connect(process.env.MONGODB_URI);
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on :${port}`));

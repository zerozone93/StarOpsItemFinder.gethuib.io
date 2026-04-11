import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import resourcesRouter from './routes/resources.js';
import weaponsRouter from './routes/weapons.js';
import armorRouter from './routes/armor.js';
import vendorsRouter from './routes/vendors.js';
import locationsRouter from './routes/locations.js';
import recipesRouter from './routes/recipes.js';
import searchRouter from './routes/search.js';
import assistantRouter from './routes/assistant.js';
import adminRouter from './routes/admin.js';
import importRouter from './routes/import.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(apiLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/resources', resourcesRouter);
app.use('/api/weapons', weaponsRouter);
app.use('/api/armor', armorRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/search', searchRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/admin', adminRouter);
app.use('/api/import', importRouter);

app.use(errorHandler);

app.listen(PORT, () => console.log(`🚀 Star Ops backend running on http://localhost:${PORT}`));
export default app;

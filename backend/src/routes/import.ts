import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { importJson } from '../controllers/importController.js';
const router = Router();
router.post('/json', requireAuth, importJson);
export default router;

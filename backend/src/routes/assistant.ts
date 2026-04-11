import { Router } from 'express';
import { assistant } from '../controllers/assistantController.js';
import { assistantLimiter } from '../middleware/rateLimiter.js';
const router = Router();
router.post('/', assistantLimiter, assistant);
export default router;

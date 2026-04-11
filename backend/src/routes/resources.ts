import { Router } from 'express';
import { getResources, getResourceBySlug } from '../controllers/resourceController.js';
const router = Router();
router.get('/', getResources);
router.get('/:slug', getResourceBySlug);
export default router;

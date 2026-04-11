import { Router } from 'express';
import { getArmor, getArmorBySlug } from '../controllers/armorController.js';
const router = Router();
router.get('/', getArmor);
router.get('/:slug', getArmorBySlug);
export default router;

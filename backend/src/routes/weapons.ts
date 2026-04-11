import { Router } from 'express';
import { getWeapons, getWeaponBySlug } from '../controllers/weaponController.js';
const router = Router();
router.get('/', getWeapons);
router.get('/:slug', getWeaponBySlug);
export default router;

import { Router } from 'express';
import { getLocations, getLocationBySlug } from '../controllers/locationController.js';
const router = Router();
router.get('/', getLocations);
router.get('/:slug', getLocationBySlug);
export default router;

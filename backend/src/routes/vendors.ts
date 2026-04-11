import { Router } from 'express';
import { getVendors, getVendorBySlug } from '../controllers/vendorController.js';
const router = Router();
router.get('/', getVendors);
router.get('/:slug', getVendorBySlug);
export default router;

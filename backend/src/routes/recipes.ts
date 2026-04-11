import { Router } from 'express';
import { getRecipes } from '../controllers/recipeController.js';
const router = Router();
router.get('/', getRecipes);
export default router;

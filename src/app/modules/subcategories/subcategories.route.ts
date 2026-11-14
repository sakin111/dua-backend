import { Router } from 'express';
import { subcategoriesController } from './subcategories.controller';

const router = Router();

router.get('/:catId/subcategories', subcategoriesController.getByCategoryId);

export default router;

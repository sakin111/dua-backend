import { Router } from 'express';
import categoriesRouter from '../modules/categories/categories.route';
import subcategoriesRouter from '../modules/subcategories/subcategories.route';
import duasRouter from '../modules/duas/duas.route';

const router = Router();

router.use('/categories', categoriesRouter);
router.use('/categories', subcategoriesRouter);
router.use('/', duasRouter);

export default router;

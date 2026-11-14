import { Router } from 'express';
import { duasController } from './duas.controller';

const router = Router();

router.get('/categories/:catId/duas', duasController.getByCategoryId);
router.get('/subcategories/:subId/duas', duasController.getBySubcategoryId);

export default router;

import type { RequestHandler } from 'express';
import { categoriesService } from './categories.service';
import CatchAsync from '../../utils/CatchAsync';

const getAllCategories: RequestHandler = CatchAsync(async (_req, res) => {
  const categories = categoriesService.getAllCategories();

  if (categories.length === 0) {
    res.status(404).json({
      success: false,
      message: 'No categories found',
      data: null,
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Categories retrieved successfully',
    data: categories,
  });
});

export const categoriesController = {
  getAllCategories,
};

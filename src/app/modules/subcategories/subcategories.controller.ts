import type { RequestHandler } from 'express';
import CatchAsync from '../../utils/CatchAsync';
import { subcategoriesService } from './subcategories.service';

const parsePositiveInteger = (value: string | string[]): number | null => {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
};

const getByCategoryId: RequestHandler = CatchAsync(async (req, res) => {
  const catId = parsePositiveInteger(req.params.catId);

  if (catId === null) {
    res.status(400).json({
      success: false,
      message: 'catId must be a positive integer',
      data: null,
    });
    return;
  }

  const subcategories = await subcategoriesService.getSubcategoriesByCategoryId(catId);

  if (subcategories.length === 0) {
    res.status(404).json({
      success: false,
      message: 'No subcategories found for this category',
      data: null,
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Subcategories retrieved successfully',
    data: subcategories,
  });
});

export const subcategoriesController = {
  getByCategoryId,
};

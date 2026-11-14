import type { RequestHandler } from 'express';
import CatchAsync from '../../utils/CatchAsync';
import { duasService } from './duas.service';

const parsePositiveInteger = (value: string | string[]): number | null => {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
};

const getBySubcategoryId: RequestHandler = CatchAsync(async (req, res) => {
  const subId = parsePositiveInteger(req.params.subId);

  if (subId === null) {
    res.status(400).json({
      success: false,
      message: 'subId must be a positive integer',
      data: null,
    });
    return;
  }

  const duas = duasService.getDuasBySubcategoryId(subId);

  if (duas.length === 0) {
    res.status(404).json({
      success: false,
      message: 'No duas found for this subcategory',
      data: null,
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Duas retrieved successfully',
    data: duas,
  });
});

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

  const duas = duasService.getDuasByCategoryId(catId);

  if (duas.length === 0) {
    res.status(404).json({
      success: false,
      message: 'No duas found for this category',
      data: null,
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Duas retrieved successfully',
    data: duas,
  });
});

export const duasController = {
  getBySubcategoryId,
  getByCategoryId,
};

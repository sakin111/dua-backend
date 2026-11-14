import { db } from '../../db/connection';
import { quoteIdentifier, schema } from '../../db/schema';
import type { Category } from './categories.types';

const columns = schema.category.columns;
const selectedColumns = Object.values(columns).map(quoteIdentifier).join(', ');

const getAllCategories = (): Category[] => {
  return db
    .prepare<[], Category>(
      `SELECT ${selectedColumns}
       FROM ${quoteIdentifier(schema.category.table)}
       ORDER BY ${quoteIdentifier(columns.cat_id)}`,
    )
    .all();
};

export const categoriesService = {
  getAllCategories,
};

import { db } from '../../db/connection';
import { quoteIdentifier, schema } from '../../db/schema';
import type { SubCategory } from './subcategories.types';

const columns = schema.subCategory.columns;
const selectedColumns = Object.values(columns).map(quoteIdentifier).join(', ');

const getSubcategoriesByCategoryId = (catId: number): SubCategory[] => {
  return db
    .prepare<[number], SubCategory>(
      `SELECT ${selectedColumns}
       FROM ${quoteIdentifier(schema.subCategory.table)}
       WHERE ${quoteIdentifier(columns.cat_id)} = ?
       ORDER BY ${quoteIdentifier(columns.subcat_id)}`,
    )
    .all(catId);
};

export const subcategoriesService = {
  getSubcategoriesByCategoryId,
};

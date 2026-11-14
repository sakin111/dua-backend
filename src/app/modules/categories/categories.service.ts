import { db } from '../../db/connection';
import { quoteIdentifier, schema } from '../../db/schema';
import type { Category } from './categories.types';

const columns = schema.category.columns;
const selectedColumns = Object.values(columns).map(quoteIdentifier).join(', ');

const getAllCategories = async (): Promise<Category[]> => {
  const result = await db.execute(
    `SELECT ${selectedColumns}
     FROM ${quoteIdentifier(schema.category.table)}
     ORDER BY ${quoteIdentifier(columns.cat_id)}`,
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    cat_id: Number(row.cat_id),
    cat_name_en: String(row.cat_name_en),
    no_of_subcat: Number(row.no_of_subcat),
    no_of_dua: Number(row.no_of_dua),
  }));
};

export const categoriesService = {
  getAllCategories,
};

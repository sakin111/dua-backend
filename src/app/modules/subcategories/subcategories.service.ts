import { db } from '../../db/connection';
import { quoteIdentifier, schema } from '../../db/schema';
import type { SubCategory } from './subcategories.types';

const columns = schema.subCategory.columns;
const selectedColumns = Object.values(columns).map(quoteIdentifier).join(', ');

const getSubcategoriesByCategoryId = async (
  catId: number,
): Promise<SubCategory[]> => {
  const result = await db.execute({
    sql: `SELECT ${selectedColumns}
          FROM ${quoteIdentifier(schema.subCategory.table)}
          WHERE ${quoteIdentifier(columns.cat_id)} = ?
          ORDER BY ${quoteIdentifier(columns.subcat_id)}`,
    args: [catId],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    cat_id: Number(row.cat_id),
    subcat_id: Number(row.subcat_id),
    subcat_name_en: String(row.subcat_name_en),
    no_of_dua: Number(row.no_of_dua),
  }));
};

export const subcategoriesService = {
  getSubcategoriesByCategoryId,
};

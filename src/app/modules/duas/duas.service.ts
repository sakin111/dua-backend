import { db } from '../../db/connection';
import { quoteIdentifier, schema } from '../../db/schema';
import type { Dua } from './duas.types';

const columns = schema.dua.columns;
const selectedColumns = Object.values(columns).map(quoteIdentifier).join(', ');
const table = quoteIdentifier(schema.dua.table);

const getDuasBySubcategoryId = async (subId: number): Promise<Dua[]> => {
  const result = await db.execute({
    sql: `SELECT ${selectedColumns}
          FROM ${table}
          WHERE ${quoteIdentifier(columns.subcat_id)} = ?
          ORDER BY ${quoteIdentifier(columns.dua_id)}`,
    args: [subId],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    cat_id: Number(row.cat_id),
    subcat_id: Number(row.subcat_id),
    dua_id: Number(row.dua_id),
    dua_name_en: String(row.dua_name_en),
    top_en: String(row.top_en),
    dua_arabic: String(row.dua_arabic),
    transliteration_en: String(row.transliteration_en),
    translation_en: String(row.translation_en),
    bottom_en: String(row.bottom_en),
    refference_en: String(row.refference_en),
  }));
};

const getDuasByCategoryId = async (catId: number): Promise<Dua[]> => {
  const result = await db.execute({
    sql: `SELECT ${selectedColumns}
          FROM ${table}
          WHERE ${quoteIdentifier(columns.cat_id)} = ?
          ORDER BY ${quoteIdentifier(columns.subcat_id)}, ${quoteIdentifier(columns.dua_id)}`,
    args: [catId],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    cat_id: Number(row.cat_id),
    subcat_id: Number(row.subcat_id),
    dua_id: Number(row.dua_id),
    dua_name_en: String(row.dua_name_en),
    top_en: String(row.top_en),
    dua_arabic: String(row.dua_arabic),
    transliteration_en: String(row.transliteration_en),
    translation_en: String(row.translation_en),
    bottom_en: String(row.bottom_en),
    refference_en: String(row.refference_en),
  }));
};

export const duasService = {
  getDuasBySubcategoryId,
  getDuasByCategoryId,
};

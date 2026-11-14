import { db } from '../../db/connection';
import { quoteIdentifier, schema } from '../../db/schema';
import type { Dua } from './duas.types';

const columns = schema.dua.columns;
const selectedColumns = Object.values(columns).map(quoteIdentifier).join(', ');
const table = quoteIdentifier(schema.dua.table);

const getDuasBySubcategoryId = (subId: number): Dua[] => {
  return db
    .prepare<[number], Dua>(
      `SELECT ${selectedColumns}
       FROM ${table}
       WHERE ${quoteIdentifier(columns.subcat_id)} = ?
       ORDER BY ${quoteIdentifier(columns.dua_id)}`,
    )
    .all(subId);
};

const getDuasByCategoryId = (catId: number): Dua[] => {
  return db
    .prepare<[number], Dua>(
      `SELECT ${selectedColumns}
       FROM ${table}
       WHERE ${quoteIdentifier(columns.cat_id)} = ?
       ORDER BY ${quoteIdentifier(columns.subcat_id)}, ${quoteIdentifier(columns.dua_id)}`,
    )
    .all(catId);
};

export const duasService = {
  getDuasBySubcategoryId,
  getDuasByCategoryId,
};

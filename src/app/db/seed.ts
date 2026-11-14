import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { db, init } from './connection';
import { quoteIdentifier, schema } from './schema';
import type { InStatement } from '@libsql/client' with { 'resolution-mode': 'import' };

interface DuaPart {
  intro?: string | null;
  arabic?: string | null;
  arabic_alt?: string | null;
  transliteration?: string | null;
  translation?: string | null;
  note?: string | null;
}

interface ContentDua {
  id: number;
  title: string;
  category?: string | null;
  category_url?: string | null;
  subcategory?: string | null;
  subcategory_url?: string | null;
  url: string;
  intro?: string | null;
  parts: DuaPart[];
  reference?: string | null;
  benefits?: string | null;
  site_tags?: string[] | null;
  raw_markdown?: string | null;
}

interface ContentDataset {
  categories: Array<{ name: string; url: string; subcategory_count: number }>;
  duas: ContentDua[];
  ruqyah_articles: Array<{
    id: number;
    category: string;
    category_url: string;
    subcategory: string;
    subcategory_url: string;
    source_url: string;
    text: string;
  }>;
}

const q = quoteIdentifier;
const sourceCategory = schema.sourceCategory;
const category = schema.category;
const subcategory = schema.subCategory;
const dua = schema.dua;
const duaPart = schema.duaPart;
const duaMetadata = schema.duaMetadata;
const article = schema.ruqyahArticle;

const seedDatabase = async (): Promise<void> => {
  await init();

  const dataPath = path.resolve(
    process.cwd(),
    'src',
    'app',
    'db',
    'duaruqyah_content.json',
  );
  const dataset = JSON.parse(readFileSync(dataPath, 'utf8')) as ContentDataset;

  if (
    !Array.isArray(dataset.categories) ||
    !Array.isArray(dataset.duas) ||
    !Array.isArray(dataset.ruqyah_articles) ||
    dataset.duas.length === 0
  ) {
    throw new Error(`Content dataset is missing expected records: ${dataPath}`);
  }

  const categoryUrlByName = new Map(
    dataset.categories.map((row) => [row.name, row.url]),
  );
  const categoryRows = new Map<string, { cat_name_en: string }>();
  const subcategoryRows = new Map<
    string,
    {
      catKey: string;
      subcatName: string;
      subcategoryUrl: string | null;
    }
  >();

  const categoryKey = (row: ContentDua): string => {
    const name = row.category?.trim() || 'Uncategorized';
    return row.category_url || categoryUrlByName.get(name) || `uncategorized:${name}`;
  };
  const subcategoryKey = (row: ContentDua, catKey: string): string =>
    row.subcategory_url ||
    `${catKey}\u0000${row.subcategory?.trim() || 'Uncategorized'}`;

  for (const row of dataset.duas) {
    if (
      !Number.isInteger(row.id) ||
      !row.title?.trim() ||
      !row.url ||
      !Array.isArray(row.parts)
    ) {
      throw new Error(`Invalid dua record in content dataset: ${JSON.stringify(row)}`);
    }

    const catKey = categoryKey(row);
    const catName = row.category?.trim() || 'Uncategorized';
    categoryRows.set(catKey, { cat_name_en: catName });
    subcategoryRows.set(subcategoryKey(row, catKey), {
      catKey,
      subcatName: row.subcategory?.trim() || 'Uncategorized',
      subcategoryUrl: row.subcategory_url || null,
    });
  }

  const categoryOrder = new Map(
    dataset.categories.map((row, index) => [row.name, index]),
  );
  const orderedCategories = [...categoryRows.entries()].sort(
    ([, a], [, b]) =>
      (categoryOrder.get(a.cat_name_en) ?? Number.MAX_SAFE_INTEGER) -
        (categoryOrder.get(b.cat_name_en) ?? Number.MAX_SAFE_INTEGER) ||
      a.cat_name_en.localeCompare(b.cat_name_en),
  );
  const categoryIds = new Map(
    orderedCategories.map(([key], index) => [key, index + 1]),
  );
  const orderedSubcategories = [...subcategoryRows.entries()].sort(
    ([, a], [, b]) =>
      (categoryIds.get(a.catKey) ?? 0) - (categoryIds.get(b.catKey) ?? 0) ||
      (a.subcategoryUrl ?? a.subcatName).localeCompare(
        b.subcategoryUrl ?? b.subcatName,
      ),
  );
  const subcategoryIds = new Map(
    orderedSubcategories.map(([key], index) => [key, index + 1]),
  );

  const categoryCounts = new Map<
    number,
    { subcategories: Set<number>; duas: number }
  >();
  const subcategoryCounts = new Map<number, number>();
  for (const [catKey] of orderedCategories) {
    const id = categoryIds.get(catKey);
    if (id !== undefined) {
      categoryCounts.set(id, { subcategories: new Set(), duas: 0 });
    }
  }

  for (const row of dataset.duas) {
    const catId = categoryIds.get(categoryKey(row));
    const subcatId = subcategoryIds.get(
      subcategoryKey(row, categoryKey(row)),
    );
    if (catId === undefined || subcatId === undefined) {
      throw new Error(`Unable to assign category for dua ${row.id}.`);
    }
    categoryCounts.get(catId)?.subcategories.add(subcatId);
    categoryCounts.get(catId)!.duas += 1;
    subcategoryCounts.set(subcatId, (subcategoryCounts.get(subcatId) ?? 0) + 1);
  }

  const existingDuaRows = await db.execute(
    `SELECT ${q(dua.columns.id)}, ${q(dua.columns.subcat_id)}, ${q(dua.columns.dua_id)}
     FROM ${q(dua.table)}`,
  );
  const duaRowIdByKey = new Map<string, number>();
  let nextDuaRowId = 1;
  for (const row of existingDuaRows.rows) {
    const id = Number(row[dua.columns.id]);
    const key = `${Number(row[dua.columns.subcat_id])}:${Number(row[dua.columns.dua_id])}`;
    duaRowIdByKey.set(key, id);
    nextDuaRowId = Math.max(nextDuaRowId, id + 1);
  }

  const statements: InStatement[] = [];
  const add = (
    sql: string,
    args: Record<string, string | number | null>,
  ): void => {
    statements.push({ sql, args });
  };

  statements.push(`
    DELETE FROM ${q(dua.table)}
    WHERE ${q(dua.columns.dua_name_en)} LIKE 'Local test dua %'
      AND ${q(dua.columns.top_en)} = 'Local test seed data'
  `);

  const insertSourceCategory = `
    INSERT INTO ${q(sourceCategory.table)}
      (${q(sourceCategory.columns.name)}, ${q(sourceCategory.columns.url)},
       ${q(sourceCategory.columns.subcategory_count)})
    VALUES (@name, @url, @subcategory_count)
    ON CONFLICT(${q(sourceCategory.columns.url)}) DO UPDATE SET
      ${q(sourceCategory.columns.name)} = excluded.${q(sourceCategory.columns.name)},
      ${q(sourceCategory.columns.subcategory_count)} =
        excluded.${q(sourceCategory.columns.subcategory_count)}
  `;
  for (const row of dataset.categories) {
    add(insertSourceCategory, row);
  }

  const insertCategory = `
    INSERT INTO ${q(category.table)}
      (${q(category.columns.cat_id)}, ${q(category.columns.cat_name_en)},
       ${q(category.columns.no_of_subcat)}, ${q(category.columns.no_of_dua)})
    VALUES (@cat_id, @cat_name_en, @no_of_subcat, @no_of_dua)
    ON CONFLICT(${q(category.columns.cat_id)}) DO UPDATE SET
      ${q(category.columns.cat_name_en)} = excluded.${q(category.columns.cat_name_en)},
      ${q(category.columns.no_of_subcat)} = excluded.${q(category.columns.no_of_subcat)},
      ${q(category.columns.no_of_dua)} = excluded.${q(category.columns.no_of_dua)}
  `;
  for (const [catKey, row] of orderedCategories) {
    const catId = categoryIds.get(catKey);
    if (catId === undefined) {
      throw new Error(`Missing generated category ID for ${row.cat_name_en}.`);
    }
    const counts = categoryCounts.get(catId);
    add(insertCategory, {
      cat_id: catId,
      cat_name_en: row.cat_name_en,
      no_of_subcat: counts?.subcategories.size ?? 0,
      no_of_dua: counts?.duas ?? 0,
    });
  }

  const insertSubcategory = `
    INSERT INTO ${q(subcategory.table)}
      (${q(subcategory.columns.cat_id)}, ${q(subcategory.columns.subcat_id)},
       ${q(subcategory.columns.subcat_name_en)}, ${q(subcategory.columns.no_of_dua)})
    VALUES (@cat_id, @subcat_id, @subcat_name_en, @no_of_dua)
    ON CONFLICT(${q(subcategory.columns.subcat_id)}) DO UPDATE SET
      ${q(subcategory.columns.cat_id)} = excluded.${q(subcategory.columns.cat_id)},
      ${q(subcategory.columns.subcat_name_en)} = excluded.${q(subcategory.columns.subcat_name_en)},
      ${q(subcategory.columns.no_of_dua)} = excluded.${q(subcategory.columns.no_of_dua)}
  `;
  for (const [subcatKey, row] of orderedSubcategories) {
    const catId = categoryIds.get(row.catKey);
    const subcatId = subcategoryIds.get(subcatKey);
    if (catId === undefined || subcatId === undefined) {
      throw new Error(`Unable to assign category to subcategory ${row.subcatName}.`);
    }
    add(insertSubcategory, {
      cat_id: catId,
      subcat_id: subcatId,
      subcat_name_en: row.subcatName,
      no_of_dua: subcategoryCounts.get(subcatId) ?? 0,
    });
  }

  const insertDua = `
    INSERT INTO ${q(dua.table)}
      (${Object.values(dua.columns).map(q).join(', ')})
    VALUES (@id, @cat_id, @subcat_id, @dua_id, @dua_name_en, @top_en,
            @dua_arabic, @transliteration_en, @translation_en, @bottom_en,
            @refference_en)
    ON CONFLICT(${q(dua.columns.subcat_id)}, ${q(dua.columns.dua_id)}) DO UPDATE SET
      ${q(dua.columns.cat_id)} = excluded.${q(dua.columns.cat_id)},
      ${q(dua.columns.dua_name_en)} = excluded.${q(dua.columns.dua_name_en)},
      ${q(dua.columns.top_en)} = excluded.${q(dua.columns.top_en)},
      ${q(dua.columns.dua_arabic)} = excluded.${q(dua.columns.dua_arabic)},
      ${q(dua.columns.transliteration_en)} = excluded.${q(dua.columns.transliteration_en)},
      ${q(dua.columns.translation_en)} = excluded.${q(dua.columns.translation_en)},
      ${q(dua.columns.bottom_en)} = excluded.${q(dua.columns.bottom_en)},
      ${q(dua.columns.refference_en)} = excluded.${q(dua.columns.refference_en)}
  `;
  const deleteDuaParts = `
    DELETE FROM ${q(duaPart.table)}
    WHERE ${q(duaPart.columns.dua_row_id)} = @dua_row_id
  `;
  const insertDuaPart = `
    INSERT INTO ${q(duaPart.table)}
      (${Object.values(duaPart.columns).map(q).join(', ')})
    VALUES (@dua_row_id, @part_no, @intro, @arabic, @arabic_alt,
            @transliteration, @translation, @note)
  `;
  const insertDuaMetadata = `
    INSERT INTO ${q(duaMetadata.table)}
      (${Object.values(duaMetadata.columns).map(q).join(', ')})
    VALUES (@dua_row_id, @source_url, @category_url, @subcategory_url, @benefits,
            @site_tags, @raw_markdown)
    ON CONFLICT(${q(duaMetadata.columns.dua_row_id)}) DO UPDATE SET
      ${q(duaMetadata.columns.source_url)} = excluded.${q(duaMetadata.columns.source_url)},
      ${q(duaMetadata.columns.category_url)} = excluded.${q(duaMetadata.columns.category_url)},
      ${q(duaMetadata.columns.subcategory_url)} = excluded.${q(duaMetadata.columns.subcategory_url)},
      ${q(duaMetadata.columns.benefits)} = excluded.${q(duaMetadata.columns.benefits)},
      ${q(duaMetadata.columns.site_tags)} = excluded.${q(duaMetadata.columns.site_tags)},
      ${q(duaMetadata.columns.raw_markdown)} = excluded.${q(duaMetadata.columns.raw_markdown)}
  `;

  for (const row of dataset.duas) {
    const catId = categoryIds.get(categoryKey(row));
    const subcatId = subcategoryIds.get(
      subcategoryKey(row, categoryKey(row)),
    );
    if (catId === undefined || subcatId === undefined) {
      throw new Error(`Unable to assign database IDs for dua ${row.id}.`);
    }

    const key = `${subcatId}:${row.id}`;
    let duaRowId = duaRowIdByKey.get(key);
    if (duaRowId === undefined) {
      duaRowId = nextDuaRowId++;
      duaRowIdByKey.set(key, duaRowId);
    }

    const firstPart = row.parts[0];
    add(insertDua, {
      id: duaRowId,
      cat_id: catId,
      subcat_id: subcatId,
      dua_id: row.id,
      dua_name_en: row.title,
      top_en: firstPart?.intro ?? row.intro ?? '',
      dua_arabic: firstPart?.arabic ?? '',
      transliteration_en: firstPart?.transliteration ?? '',
      translation_en: firstPart?.translation ?? '',
      bottom_en: firstPart?.note ?? '',
      refference_en: row.reference ?? '',
    });

    add(deleteDuaParts, { dua_row_id: duaRowId });
    row.parts.forEach((part, index) => {
      add(insertDuaPart, {
        dua_row_id: duaRowId,
        part_no: index + 1,
        intro: part.intro ?? null,
        arabic: part.arabic ?? null,
        arabic_alt: part.arabic_alt ?? null,
        transliteration: part.transliteration ?? null,
        translation: part.translation ?? null,
        note: part.note ?? null,
      });
    });

    add(insertDuaMetadata, {
      dua_row_id: duaRowId,
      source_url: row.url,
      category_url: row.category_url ?? null,
      subcategory_url: row.subcategory_url ?? null,
      benefits: row.benefits ?? null,
      site_tags: row.site_tags ? JSON.stringify(row.site_tags) : null,
      raw_markdown: row.raw_markdown ?? null,
    });
  }

  const insertArticle = `
    INSERT INTO ${q(article.table)}
      (${Object.values(article.columns).map(q).join(', ')})
    VALUES (@id, @category, @category_url, @subcategory, @subcategory_url,
            @source_url, @text)
    ON CONFLICT(${q(article.columns.source_id)}) DO UPDATE SET
      ${q(article.columns.category)} = excluded.${q(article.columns.category)},
      ${q(article.columns.category_url)} = excluded.${q(article.columns.category_url)},
      ${q(article.columns.subcategory)} = excluded.${q(article.columns.subcategory)},
      ${q(article.columns.subcategory_url)} = excluded.${q(article.columns.subcategory_url)},
      ${q(article.columns.source_url)} = excluded.${q(article.columns.source_url)},
      ${q(article.columns.text)} = excluded.${q(article.columns.text)}
  `;
  for (const row of dataset.ruqyah_articles) {
    add(insertArticle, row);
  }

  await db.batch(statements, 'write');

  const duaPartCount = dataset.duas.reduce(
    (count, row) => count + row.parts.length,
    0,
  );
  const uncategorizedCount = dataset.duas.filter(
    (row) => !row.category?.trim() || !row.subcategory?.trim(),
  ).length;
  const incompleteTextCount = dataset.duas.filter((row) => {
    const part = row.parts[0];
    return !part?.arabic || !part.transliteration || !part.translation;
  }).length;

  console.log(
    `Imported ${dataset.categories.length} source categories, ${dataset.duas.length} duas ` +
      `(${duaPartCount} text parts), and ${dataset.ruqyah_articles.length} ruqyah articles.`,
  );
  if (uncategorizedCount > 0) {
    console.warn(
      `${uncategorizedCount} duas without a category or subcategory were grouped as Uncategorized.`,
    );
  }
  if (incompleteTextCount > 0) {
    console.warn(
      `${incompleteTextCount} duas have missing Arabic, transliteration, or translation fields in the source dataset.`,
    );
  }
};

void seedDatabase()
  .catch((error: unknown) => {
    console.error('Content seeding failed.', error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });

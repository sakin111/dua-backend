import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { db } from './connection';
import { quoteIdentifier, schema } from './schema';

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

db.exec(`
  CREATE TABLE IF NOT EXISTS ${q(category.table)} (
    ${q(category.columns.id)} INTEGER PRIMARY KEY AUTOINCREMENT,
    ${q(category.columns.cat_id)} INTEGER NOT NULL UNIQUE,
    ${q(category.columns.cat_name_en)} TEXT NOT NULL,
    ${q(category.columns.no_of_subcat)} INTEGER NOT NULL,
    ${q(category.columns.no_of_dua)} INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ${q(subcategory.table)} (
    ${q(subcategory.columns.id)} INTEGER PRIMARY KEY AUTOINCREMENT,
    ${q(subcategory.columns.cat_id)} INTEGER NOT NULL,
    ${q(subcategory.columns.subcat_id)} INTEGER NOT NULL UNIQUE,
    ${q(subcategory.columns.subcat_name_en)} TEXT NOT NULL,
    ${q(subcategory.columns.no_of_dua)} INTEGER NOT NULL,
    FOREIGN KEY (${q(subcategory.columns.cat_id)})
      REFERENCES ${q(category.table)} (${q(category.columns.cat_id)})
  );

  CREATE TABLE IF NOT EXISTS ${q(dua.table)} (
    ${q(dua.columns.id)} INTEGER PRIMARY KEY AUTOINCREMENT,
    ${q(dua.columns.cat_id)} INTEGER NOT NULL,
    ${q(dua.columns.subcat_id)} INTEGER NOT NULL,
    ${q(dua.columns.dua_id)} INTEGER NOT NULL,
    ${q(dua.columns.dua_name_en)} TEXT NOT NULL,
    ${q(dua.columns.top_en)} TEXT NOT NULL,
    ${q(dua.columns.dua_arabic)} TEXT NOT NULL,
    ${q(dua.columns.transliteration_en)} TEXT NOT NULL,
    ${q(dua.columns.translation_en)} TEXT NOT NULL,
    ${q(dua.columns.bottom_en)} TEXT NOT NULL,
    ${q(dua.columns.refference_en)} TEXT NOT NULL,
    UNIQUE (${q(dua.columns.subcat_id)}, ${q(dua.columns.dua_id)}),
    FOREIGN KEY (${q(dua.columns.cat_id)})
      REFERENCES ${q(category.table)} (${q(category.columns.cat_id)}),
    FOREIGN KEY (${q(dua.columns.subcat_id)})
      REFERENCES ${q(subcategory.table)} (${q(subcategory.columns.subcat_id)})
  );

  CREATE TABLE IF NOT EXISTS ${q(sourceCategory.table)} (
    ${q(sourceCategory.columns.name)} TEXT NOT NULL,
    ${q(sourceCategory.columns.url)} TEXT PRIMARY KEY,
    ${q(sourceCategory.columns.subcategory_count)} INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ${q(duaPart.table)} (
    ${q(duaPart.columns.dua_row_id)} INTEGER NOT NULL,
    ${q(duaPart.columns.part_no)} INTEGER NOT NULL,
    ${q(duaPart.columns.intro)} TEXT,
    ${q(duaPart.columns.arabic)} TEXT,
    ${q(duaPart.columns.arabic_alt)} TEXT,
    ${q(duaPart.columns.transliteration)} TEXT,
    ${q(duaPart.columns.translation)} TEXT,
    ${q(duaPart.columns.note)} TEXT,
    PRIMARY KEY (${q(duaPart.columns.dua_row_id)}, ${q(duaPart.columns.part_no)}),
    FOREIGN KEY (${q(duaPart.columns.dua_row_id)})
      REFERENCES ${q(dua.table)} (${q(dua.columns.id)}) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ${q(duaMetadata.table)} (
    ${q(duaMetadata.columns.dua_row_id)} INTEGER PRIMARY KEY,
    ${q(duaMetadata.columns.source_url)} TEXT NOT NULL,
    ${q(duaMetadata.columns.category_url)} TEXT,
    ${q(duaMetadata.columns.subcategory_url)} TEXT,
    ${q(duaMetadata.columns.benefits)} TEXT,
    ${q(duaMetadata.columns.site_tags)} TEXT,
    ${q(duaMetadata.columns.raw_markdown)} TEXT,
    FOREIGN KEY (${q(duaMetadata.columns.dua_row_id)})
      REFERENCES ${q(dua.table)} (${q(dua.columns.id)}) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ${q(article.table)} (
    ${q(article.columns.source_id)} INTEGER PRIMARY KEY,
    ${q(article.columns.category)} TEXT NOT NULL,
    ${q(article.columns.category_url)} TEXT NOT NULL,
    ${q(article.columns.subcategory)} TEXT NOT NULL,
    ${q(article.columns.subcategory_url)} TEXT NOT NULL,
    ${q(article.columns.source_url)} TEXT NOT NULL,
    ${q(article.columns.text)} TEXT NOT NULL
  );
`);

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
const categoryRows = new Map<
  string,
  { cat_name_en: string }
>();
const subcategoryRows = new Map<
  string,
  {
    catKey: string;
    catName: string;
    subcatName: string;
    subcategoryUrl: string | null;
  }
>();

const categoryKey = (row: ContentDua): string => {
  const name = row.category?.trim() || 'Uncategorized';
  return row.category_url || categoryUrlByName.get(name) || `uncategorized:${name}`;
};

const subcategoryKey = (row: ContentDua, catKey: string): string =>
  row.subcategory_url || `${catKey}\u0000${row.subcategory?.trim() || 'Uncategorized'}`;

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
    catName,
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

const categoryCounts = new Map<number, { subcategories: Set<number>; duas: number }>();
const subcategoryCounts = new Map<number, number>();
for (const [catKey] of orderedCategories) {
  const id = categoryIds.get(catKey);
  if (id !== undefined) categoryCounts.set(id, { subcategories: new Set(), duas: 0 });
}

for (const row of dataset.duas) {
  const catKey = categoryKey(row);
  const catId = categoryIds.get(catKey);
  const subcatKey = subcategoryKey(row, catKey);
  const subcatId = subcategoryIds.get(subcatKey);
  if (catId === undefined || subcatId === undefined) {
    throw new Error(`Unable to assign category for dua ${row.id}.`);
  }
  categoryCounts.get(catId)?.subcategories.add(subcatId);
  categoryCounts.get(catId)!.duas += 1;
  subcategoryCounts.set(subcatId, (subcategoryCounts.get(subcatId) ?? 0) + 1);
}

const insertSourceCategory = db.prepare<{
  name: string;
  url: string;
  subcategory_count: number;
}>(`
  INSERT INTO ${q(sourceCategory.table)}
    (${q(sourceCategory.columns.name)}, ${q(sourceCategory.columns.url)},
     ${q(sourceCategory.columns.subcategory_count)})
  VALUES (@name, @url, @subcategory_count)
  ON CONFLICT(${q(sourceCategory.columns.url)}) DO UPDATE SET
    ${q(sourceCategory.columns.name)} = excluded.${q(sourceCategory.columns.name)},
    ${q(sourceCategory.columns.subcategory_count)} =
      excluded.${q(sourceCategory.columns.subcategory_count)}
`);
const insertCategory = db.prepare<{
  cat_id: number;
  cat_name_en: string;
  no_of_subcat: number;
  no_of_dua: number;
}>(`
  INSERT INTO ${q(category.table)}
    (${q(category.columns.cat_id)}, ${q(category.columns.cat_name_en)},
     ${q(category.columns.no_of_subcat)}, ${q(category.columns.no_of_dua)})
  VALUES (@cat_id, @cat_name_en, @no_of_subcat, @no_of_dua)
  ON CONFLICT(${q(category.columns.cat_id)}) DO UPDATE SET
    ${q(category.columns.cat_name_en)} = excluded.${q(category.columns.cat_name_en)},
    ${q(category.columns.no_of_subcat)} = excluded.${q(category.columns.no_of_subcat)},
    ${q(category.columns.no_of_dua)} = excluded.${q(category.columns.no_of_dua)}
`);
const insertSubcategory = db.prepare<{
  cat_id: number;
  subcat_id: number;
  subcat_name_en: string;
  no_of_dua: number;
}>(`
  INSERT INTO ${q(subcategory.table)}
    (${q(subcategory.columns.cat_id)}, ${q(subcategory.columns.subcat_id)},
     ${q(subcategory.columns.subcat_name_en)}, ${q(subcategory.columns.no_of_dua)})
  VALUES (@cat_id, @subcat_id, @subcat_name_en, @no_of_dua)
  ON CONFLICT(${q(subcategory.columns.subcat_id)}) DO UPDATE SET
    ${q(subcategory.columns.cat_id)} = excluded.${q(subcategory.columns.cat_id)},
    ${q(subcategory.columns.subcat_name_en)} = excluded.${q(subcategory.columns.subcat_name_en)},
    ${q(subcategory.columns.no_of_dua)} = excluded.${q(subcategory.columns.no_of_dua)}
`);
const insertDua = db.prepare<{
  cat_id: number;
  subcat_id: number;
  dua_id: number;
  dua_name_en: string;
  top_en: string;
  dua_arabic: string;
  transliteration_en: string;
  translation_en: string;
  bottom_en: string;
  refference_en: string;
}>(`
  INSERT INTO ${q(dua.table)}
    (${Object.values(dua.columns).slice(1).map(q).join(', ')})
  VALUES (@cat_id, @subcat_id, @dua_id, @dua_name_en, @top_en, @dua_arabic,
          @transliteration_en, @translation_en, @bottom_en, @refference_en)
  ON CONFLICT(${q(dua.columns.subcat_id)}, ${q(dua.columns.dua_id)}) DO UPDATE SET
    ${q(dua.columns.cat_id)} = excluded.${q(dua.columns.cat_id)},
    ${q(dua.columns.dua_name_en)} = excluded.${q(dua.columns.dua_name_en)},
    ${q(dua.columns.top_en)} = excluded.${q(dua.columns.top_en)},
    ${q(dua.columns.dua_arabic)} = excluded.${q(dua.columns.dua_arabic)},
    ${q(dua.columns.transliteration_en)} = excluded.${q(dua.columns.transliteration_en)},
    ${q(dua.columns.translation_en)} = excluded.${q(dua.columns.translation_en)},
    ${q(dua.columns.bottom_en)} = excluded.${q(dua.columns.bottom_en)},
    ${q(dua.columns.refference_en)} = excluded.${q(dua.columns.refference_en)}
`);
const getDuaRowId = db.prepare<[number, number], { id: number }>(`
  SELECT ${q(dua.columns.id)} AS id
  FROM ${q(dua.table)}
  WHERE ${q(dua.columns.subcat_id)} = ? AND ${q(dua.columns.dua_id)} = ?
`);
const deleteDuaParts = db.prepare<[number]>(`
  DELETE FROM ${q(duaPart.table)}
  WHERE ${q(duaPart.columns.dua_row_id)} = ?
`);
const insertDuaPart = db.prepare<{
  dua_row_id: number;
  part_no: number;
  intro: string | null;
  arabic: string | null;
  arabic_alt: string | null;
  transliteration: string | null;
  translation: string | null;
  note: string | null;
}>(`
  INSERT INTO ${q(duaPart.table)}
    (${Object.values(duaPart.columns).map(q).join(', ')})
  VALUES (@dua_row_id, @part_no, @intro, @arabic, @arabic_alt, @transliteration,
          @translation, @note)
`);
const insertDuaMetadata = db.prepare<{
  dua_row_id: number;
  source_url: string;
  category_url: string | null;
  subcategory_url: string | null;
  benefits: string | null;
  site_tags: string | null;
  raw_markdown: string | null;
}>(`
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
`);
const insertArticle = db.prepare<ContentDataset['ruqyah_articles'][number]>(`
  INSERT INTO ${q(article.table)}
    (${Object.values(article.columns).map(q).join(', ')})
  VALUES (@id, @category, @category_url, @subcategory, @subcategory_url, @source_url, @text)
  ON CONFLICT(${q(article.columns.source_id)}) DO UPDATE SET
    ${q(article.columns.category)} = excluded.${q(article.columns.category)},
    ${q(article.columns.category_url)} = excluded.${q(article.columns.category_url)},
    ${q(article.columns.subcategory)} = excluded.${q(article.columns.subcategory)},
    ${q(article.columns.subcategory_url)} = excluded.${q(article.columns.subcategory_url)},
    ${q(article.columns.source_url)} = excluded.${q(article.columns.source_url)},
    ${q(article.columns.text)} = excluded.${q(article.columns.text)}
`);
const deleteLegacyTestDuas = db.prepare(`
  DELETE FROM ${q(dua.table)}
  WHERE ${q(dua.columns.dua_name_en)} LIKE 'Local test dua %'
    AND ${q(dua.columns.top_en)} = 'Local test seed data'
`);

const importContent = db.transaction(() => {
  deleteLegacyTestDuas.run();
  dataset.categories.forEach((row) => insertSourceCategory.run(row));

  for (const [catKey, row] of orderedCategories) {
    const catId = categoryIds.get(catKey);
    if (catId === undefined) throw new Error(`Missing generated category ID for ${row.cat_name_en}.`);
    const counts = categoryCounts.get(catId);
    insertCategory.run({
      cat_id: catId,
      cat_name_en: row.cat_name_en,
      no_of_subcat: counts?.subcategories.size ?? 0,
      no_of_dua: counts?.duas ?? 0,
    });
  }

  for (const [subcatKey, row] of orderedSubcategories) {
    const catId = categoryIds.get(row.catKey);
    const subcatId = subcategoryIds.get(subcatKey);
    if (catId === undefined || subcatId === undefined) {
      throw new Error(`Unable to assign category to subcategory ${row.subcatName}.`);
    }
    insertSubcategory.run({
      cat_id: catId,
      subcat_id: subcatId,
      subcat_name_en: row.subcatName,
      no_of_dua: subcategoryCounts.get(subcatId) ?? 0,
    });
  }

  for (const row of dataset.duas) {
    const catKey = categoryKey(row);
    const catId = categoryIds.get(catKey);
    const subcatId = subcategoryIds.get(subcategoryKey(row, catKey));
    if (catId === undefined || subcatId === undefined) {
      throw new Error(`Unable to assign database IDs for dua ${row.id}.`);
    }
    const firstPart = row.parts[0];
    insertDua.run({
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

    const duaRowId = getDuaRowId.get(subcatId, row.id)?.id;
    if (duaRowId === undefined) throw new Error(`Imported dua ${row.id} could not be retrieved.`);
    deleteDuaParts.run(duaRowId);
    row.parts.forEach((part, index) =>
      insertDuaPart.run({
        dua_row_id: duaRowId,
        part_no: index + 1,
        intro: part.intro ?? null,
        arabic: part.arabic ?? null,
        arabic_alt: part.arabic_alt ?? null,
        transliteration: part.transliteration ?? null,
        translation: part.translation ?? null,
        note: part.note ?? null,
      }),
    );
    insertDuaMetadata.run({
      dua_row_id: duaRowId,
      source_url: row.url,
      category_url: row.category_url ?? null,
      subcategory_url: row.subcategory_url ?? null,
      benefits: row.benefits ?? null,
      site_tags: row.site_tags ? JSON.stringify(row.site_tags) : null,
      raw_markdown: row.raw_markdown ?? null,
    });
  }

  dataset.ruqyah_articles.forEach((row) =>
    insertArticle.run({
      ...row,
      id: row.id,
    }),
  );
});

importContent();

const duaPartCount = dataset.duas.reduce((count, row) => count + row.parts.length, 0);
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

db.close();

import 'dotenv/config';
import type { Client } from '@libsql/client' with { 'resolution-mode': 'import' };
import { quoteIdentifier, schema } from './schema';

const { createClient } = require('@libsql/client') as {
  createClient: (config: { url: string; authToken?: string }) => Client;
};

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

const q = quoteIdentifier;
const category = schema.category;
const subcategory = schema.subCategory;
const dua = schema.dua;
const sourceCategory = schema.sourceCategory;
const duaPart = schema.duaPart;
const duaMetadata = schema.duaMetadata;
const article = schema.ruqyahArticle;

const createTableStatements = [
  `CREATE TABLE IF NOT EXISTS ${q(category.table)} (
    ${q(category.columns.id)} INTEGER PRIMARY KEY AUTOINCREMENT,
    ${q(category.columns.cat_id)} INTEGER NOT NULL UNIQUE,
    ${q(category.columns.cat_name_en)} TEXT NOT NULL,
    ${q(category.columns.no_of_subcat)} INTEGER NOT NULL,
    ${q(category.columns.no_of_dua)} INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ${q(subcategory.table)} (
    ${q(subcategory.columns.id)} INTEGER PRIMARY KEY AUTOINCREMENT,
    ${q(subcategory.columns.cat_id)} INTEGER NOT NULL,
    ${q(subcategory.columns.subcat_id)} INTEGER NOT NULL UNIQUE,
    ${q(subcategory.columns.subcat_name_en)} TEXT NOT NULL,
    ${q(subcategory.columns.no_of_dua)} INTEGER NOT NULL,
    FOREIGN KEY (${q(subcategory.columns.cat_id)})
      REFERENCES ${q(category.table)} (${q(category.columns.cat_id)})
  )`,
  `CREATE TABLE IF NOT EXISTS ${q(dua.table)} (
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
  )`,
  `CREATE TABLE IF NOT EXISTS ${q(sourceCategory.table)} (
    ${q(sourceCategory.columns.name)} TEXT NOT NULL,
    ${q(sourceCategory.columns.url)} TEXT PRIMARY KEY,
    ${q(sourceCategory.columns.subcategory_count)} INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ${q(duaPart.table)} (
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
  )`,
  `CREATE TABLE IF NOT EXISTS ${q(duaMetadata.table)} (
    ${q(duaMetadata.columns.dua_row_id)} INTEGER PRIMARY KEY,
    ${q(duaMetadata.columns.source_url)} TEXT NOT NULL,
    ${q(duaMetadata.columns.category_url)} TEXT,
    ${q(duaMetadata.columns.subcategory_url)} TEXT,
    ${q(duaMetadata.columns.benefits)} TEXT,
    ${q(duaMetadata.columns.site_tags)} TEXT,
    ${q(duaMetadata.columns.raw_markdown)} TEXT,
    FOREIGN KEY (${q(duaMetadata.columns.dua_row_id)})
      REFERENCES ${q(dua.table)} (${q(dua.columns.id)}) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS ${q(article.table)} (
    ${q(article.columns.source_id)} INTEGER PRIMARY KEY,
    ${q(article.columns.category)} TEXT NOT NULL,
    ${q(article.columns.category_url)} TEXT NOT NULL,
    ${q(article.columns.subcategory)} TEXT NOT NULL,
    ${q(article.columns.subcategory_url)} TEXT NOT NULL,
    ${q(article.columns.source_url)} TEXT NOT NULL,
    ${q(article.columns.text)} TEXT NOT NULL
  )`,
];

export const init = async (): Promise<void> => {
  await db.batch(createTableStatements, 'write');
};

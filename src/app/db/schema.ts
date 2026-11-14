export const schema = {
  category: {
    table: 'category',
    columns: {
      id: 'id',
      cat_id: 'cat_id',
      cat_name_en: 'cat_name_en',
      no_of_subcat: 'no_of_subcat',
      no_of_dua: 'no_of_dua',
    },
  },
  subCategory: {
    table: 'sub_category',
    columns: {
      id: 'id',
      cat_id: 'cat_id',
      subcat_id: 'subcat_id',
      subcat_name_en: 'subcat_name_en',
      no_of_dua: 'no_of_dua',
    },
  },
  dua: {
    table: 'dua',
    columns: {
      id: 'id',
      cat_id: 'cat_id',
      subcat_id: 'subcat_id',
      dua_id: 'dua_id',
      dua_name_en: 'dua_name_en',
      top_en: 'top_en',
      dua_arabic: 'dua_arabic',
      transliteration_en: 'transliteration_en',
      translation_en: 'translation_en',
      bottom_en: 'bottom_en',
      refference_en: 'refference_en',
    },
  },
  sourceCategory: {
    table: 'source_category',
    columns: {
      name: 'name',
      url: 'url',
      subcategory_count: 'subcategory_count',
    },
  },
  duaPart: {
    table: 'dua_part',
    columns: {
      dua_row_id: 'dua_row_id',
      part_no: 'part_no',
      intro: 'intro',
      arabic: 'arabic',
      arabic_alt: 'arabic_alt',
      transliteration: 'transliteration',
      translation: 'translation',
      note: 'note',
    },
  },
  duaMetadata: {
    table: 'dua_metadata',
    columns: {
      dua_row_id: 'dua_row_id',
      source_url: 'source_url',
      category_url: 'category_url',
      subcategory_url: 'subcategory_url',
      benefits: 'benefits',
      site_tags: 'site_tags',
      raw_markdown: 'raw_markdown',
    },
  },
  ruqyahArticle: {
    table: 'ruqyah_article',
    columns: {
      source_id: 'source_id',
      category: 'category',
      category_url: 'category_url',
      subcategory: 'subcategory',
      subcategory_url: 'subcategory_url',
      source_url: 'source_url',
      text: 'text',
    },
  },
} as const;

export const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replace(/"/g, '""')}"`;

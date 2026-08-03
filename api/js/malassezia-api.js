const DATA_BASE = new URL("../data/", import.meta.url);
let productsCache = null;
let ingredientsCache = null;

async function loadCsv(filename, delimiter) {
  const response = await fetch(new URL(filename, DATA_BASE));

  if (!response.ok) {
    throw new Error(
      `Could not load ${filename}: HTTP ${response.status}`
    );
  }

  const text = await response.text();

  return parseCsv(text, delimiter);
}

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // Ignore CR from Windows line endings.
    } else if (c === "\n") {
      row.push(field);
      field = "";

      if (row.some(value => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      field += c;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);

    if (row.some(value => value.trim() !== "")) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(header =>
    header.replace(/^\uFEFF/, "").trim()
  );

  return rows.slice(1).map(values => {
    const object = {};

    headers.forEach((header, index) => {
      object[header] = (values[index] ?? "").trim();
    });

    return object;
  });
}

async function getProductsData() {
  if (!productsCache) {
    productsCache = loadCsv("products.csv", ";");
  }

  return productsCache;
}

async function getIngredientsData() {
  if (!ingredientsCache) {
    ingredientsCache = loadCsv("ingredients.csv", ",");
  }

  return ingredientsCache;
}

function normalizeIngredient(value) {
  return String(value ?? "")
    .trim()
    .replace(/\./g, "");
}

const ESTER_PATTERNS = [
  /.*stearate$/i,
  /.*palmitate$/i,
  /.*laurate$/i,
  /.*oleate$/i,
  /.*myristate$/i,
  /.*linoleate$/i,
  /.*ricinoleate$/i,
  /.*arachidate$/i,
  /.*behenate$/i,
  /.* ester$/i,
  /mono.*ester/i,
  /di.*ester/i,
  /tri.*ester/i,
  /polysorbate.*/i,
  /tween.*/i,
];

const HIGH_SENSITIVITY_KEYWORDS = [
  "ferment",
  "ferment filtrate",
  "ferment extract",
  "yeast",
  "faex",
  "saccharomyces",
];

function classifyIngredient(name, knownIngredients) {
  const lower = name.toLowerCase();

  const known = knownIngredients.find(
    row =>
      (row.ingredients ?? "").trim().toLowerCase() === lower
  );

  if (known) {
    return known.category || null;
  }

  if (ESTER_PATTERNS.some(pattern => pattern.test(lower))) {
    return "esters";
  }

  if (
    HIGH_SENSITIVITY_KEYWORDS.some(keyword =>
      lower.includes(keyword)
    )
  ) {
    return "high sensitivity";
  }

  return null;
}

/**
 * GET /api/malassezia-checker/brands
 */
export async function getBrands() {
  const products = await getProductsData();

  const brands = [
    ...new Set(
      products
        .map(row => (row.brands_en ?? "").trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  return brands.map(name => ({ name }));
}

/**
 * GET /api/malassezia-checker/brands/{brandName}/products
 */
export async function getProductsByBrand(brandName) {
  const products = await getProductsData();
  const target = String(brandName).toLowerCase();

  return products
    .filter(
      row =>
        (row.brands_en ?? "").toLowerCase() === target &&
        (row.product_name ?? "") !== ""
    )
    .map(row => ({
      id: row.id ?? "",
      name: row.product_name ?? "",
      brand: row.brands_en ?? "",
      ingredients: (row.ingredients_text ?? "")
        .replace(/\./g, "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean)
        .join(", "),
    }));
}

/**
 * GET /api/malassezia-checker/products/{productId}
 */
export async function getProduct(productId) {
  const products = await getProductsData();
  const knownIngredients = await getIngredientsData();
  const target = String(productId).toLowerCase();

  const matches = products.filter(
    row =>
      (row.id ?? "").toLowerCase() === target &&
      (row.product_name ?? "") !== ""
  );

  if (matches.length === 0) {
    return [];
  }

  const ingredients = [];

  for (const row of matches) {
    for (const part of (row.ingredients_text ?? "").split(",")) {
      ingredients.push(normalizeIngredient(part));
    }
  }

  const validated = ingredients.map(name => {
    const category = classifyIngredient(name, knownIngredients);

    const item = { name };

    if (category !== null) {
      item.category = category;
    }

    return item;
  });

  return matches.map(row => ({
    id: row.id ?? "",
    name: row.product_name ?? "",
    brand: row.brands_en ?? "",
    imageUrl: row.image_url ?? "",
    ingredients: validated,
  }));
}

/**
 * POST /api/malassezia-checker/ingredients
 */
export async function validateIngredients(ingredients = []) {
  const knownIngredients = await getIngredientsData();

  return ingredients.map(raw => {
    const name = normalizeIngredient(raw);
    const category = classifyIngredient(name, knownIngredients);

    const item = { name };

    if (category !== null) {
      item.category = category;
    }

    return item;
  });
}

export const malasseziaApi = {
  getBrands,
  getProductsByBrand,
  getProduct,
  validateIngredients,
};

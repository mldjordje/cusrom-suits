import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";

const SIZE_GUIDES_PATH = "data/size-guides.json";

export type SizeGuideFit = "slim" | "regular" | "standard";
export type SizeGuideGroup = "blazer" | "trousers" | "shirt" | "shoes";

export type SizeGuideRow = {
  id: string;
  cells: string[];
};

export type SizeGuideTable = {
  id: string;
  title: string;
  group: SizeGuideGroup;
  fit: SizeGuideFit;
  headers: string[];
  rows: SizeGuideRow[];
  notes: string[];
};

export type SizeGuideCategoryImages = Partial<Record<SizeGuideGroup, string>>;

export type SizeGuideSettings = {
  updatedAt: string | null;
  imageSrc: string | null;
  imageAlt: string;
  categoryImages?: SizeGuideCategoryImages;
  tables: SizeGuideTable[];
};

const nowIso = () => new Date().toISOString();

const makeRows = (tableId: string, rows: string[][]): SizeGuideRow[] =>
  rows.map((cells, index) => ({
    id: `${tableId}-row-${index + 1}`,
    cells,
  }));

export const DEFAULT_SIZE_GUIDE_SETTINGS: SizeGuideSettings = {
  updatedAt: null,
  imageSrc: "/assets/images/size-guide.jpg",
  imageAlt: "Odredite velicinu",
  tables: [
    {
      id: "blazer-slim",
      title: "Sako - Slim fit",
      group: "blazer",
      fit: "slim",
      headers: ["Velicina", "Grudi", "Struk", "Ramena", "Duzina ledja"],
      rows: makeRows("blazer-slim", [
        ["46", "99", "90", "42-43", "72"],
        ["48", "103", "94", "43-44", "73"],
        ["50", "107", "98", "44-45", "74"],
        ["52", "111", "102", "45-46", "75"],
        ["54", "115", "106", "46-47", "76"],
        ["56", "119", "110", "47-48", "77"],
        ["58", "123", "114", "48-49", "78"],
      ]),
      notes: [],
    },
    {
      id: "blazer-regular",
      title: "Sako - Regular fit",
      group: "blazer",
      fit: "regular",
      headers: ["Velicina", "Grudi", "Struk", "Ramena", "Duzina ledja"],
      rows: makeRows("blazer-regular", [
        ["46", "103", "93", "45", "71"],
        ["48", "107", "97", "46", "72"],
        ["50", "111", "101", "47", "73"],
        ["52", "115", "105", "48", "74"],
        ["54", "119", "109", "49", "75"],
        ["56", "123", "113", "50", "76"],
        ["58", "127", "117", "51", "77"],
        ["60", "131", "121", "52", "78"],
      ]),
      notes: [],
    },
    {
      id: "trousers-slim",
      title: "Pantalone - Slim fit",
      group: "trousers",
      fit: "slim",
      headers: ["Velicina", "Struk", "Kukovi"],
      rows: makeRows("trousers-slim", [
        ["46", "84", "102"],
        ["48", "88", "106"],
        ["50", "92", "110"],
        ["52", "96", "114"],
        ["54", "100", "118"],
        ["56", "104", "122"],
        ["58", "108", "126"],
      ]),
      notes: [],
    },
    {
      id: "trousers-regular",
      title: "Pantalone - Regular fit",
      group: "trousers",
      fit: "regular",
      headers: ["Velicina", "Struk", "Kukovi"],
      rows: makeRows("trousers-regular", [
        ["46", "82", "102"],
        ["48", "86", "106"],
        ["50", "90", "110"],
        ["52", "94", "114"],
        ["54", "98", "118"],
        ["56", "102", "122"],
        ["58", "106", "126"],
        ["60", "110", "128"],
      ]),
      notes: [],
    },
    {
      id: "shirt-slim",
      title: "Kosulje - Slim fit",
      group: "shirt",
      fit: "slim",
      headers: ["Velicina", "B", "C", "D", "E", "F"],
      rows: makeRows("shirt-slim", [
        ["37", "44", "50.5", "45.5", "76.5", "66"],
        ["38", "45", "51.5", "46.5", "77", "66.5"],
        ["39", "46", "53", "48", "77.5", "66.5"],
        ["40", "47", "54.5", "49.5", "78", "67"],
        ["41", "48", "56", "51", "78.5", "67"],
        ["42", "49", "57.5", "52.5", "79", "67.5"],
        ["43", "50", "60", "55.5", "79.5", "67.5"],
        ["44", "51", "61.5", "57", "80", "68"],
        ["45", "51", "63", "58.5", "81.15", "68"],
      ]),
      notes: ["B = ramena", "C = grudi", "D = struk", "E = duzina", "F = rukav"],
    },
    {
      id: "shirt-regular",
      title: "Kosulje - Regular fit",
      group: "shirt",
      fit: "regular",
      headers: ["Velicina", "B", "C", "D", "E", "F"],
      rows: makeRows("shirt-regular", [
        ["36", "43", "52.5", "49", "76", "65.5"],
        ["37", "44", "53.5", "50", "76.5", "66"],
        ["38", "45", "54.5", "51", "77", "66.5"],
        ["39", "46", "56", "52.5", "77.5", "66.5"],
        ["40", "47", "57.5", "54", "78", "67"],
        ["41", "48", "59", "55.5", "78.5", "67"],
        ["42", "49", "60", "57", "79", "67.5"],
        ["43", "50", "62", "58.5", "79.5", "67.5"],
        ["44", "51", "63.5", "60", "80", "68"],
        ["45", "52", "65", "61.5", "80.5", "68"],
        ["46", "53", "67.5", "64", "80.5", "68.5"],
      ]),
      notes: ["B = ramena", "C = grudi", "D = struk", "E = duzina", "F = rukav"],
    },
    {
      id: "shoes-standard",
      title: "Obuca",
      group: "shoes",
      fit: "standard",
      headers: ["Broj", "Duzina gazista"],
      rows: makeRows("shoes-standard", [
        ["41", "23.5"],
        ["42", "25"],
        ["43", "26.5"],
        ["44", "28"],
        ["45", "29.5"],
      ]),
      notes: [],
    },
  ],
};

const normalizeString = (value: unknown) => String(value || "").trim();

const normalizeRow = (tableId: string, headers: string[], value: unknown, index: number): SizeGuideRow | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const rawCells = Array.isArray(row.cells) ? row.cells : [];
  const cells = headers.map((_, cellIndex) => normalizeString(rawCells[cellIndex]));
  if (cells.every((cell) => !cell)) return null;
  return {
    id: normalizeString(row.id) || `${tableId}-row-${index + 1}`,
    cells,
  };
};

const normalizeNotes = (value: unknown, max = 8) => {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, max);
};

const normalizeTable = (value: unknown, index: number): SizeGuideTable | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = normalizeString(row.id) || `table-${index + 1}`;
  const title = normalizeString(row.title) || `Tabela ${index + 1}`;
  const group = (normalizeString(row.group) || "shirt") as SizeGuideGroup;
  const fit = (normalizeString(row.fit) || "standard") as SizeGuideFit;
  const headers = Array.isArray(row.headers)
    ? row.headers.map((item) => normalizeString(item)).filter(Boolean)
    : [];
  if (!headers.length) return null;
  const rows = Array.isArray(row.rows)
    ? row.rows
        .map((item, rowIndex) => normalizeRow(id, headers, item, rowIndex))
        .filter((item): item is SizeGuideRow => Boolean(item))
    : [];

  return {
    id,
    title,
    group: ["blazer", "trousers", "shirt", "shoes"].includes(group) ? group : "shirt",
    fit: ["slim", "regular", "standard"].includes(fit) ? fit : "standard",
    headers,
    rows,
    notes: normalizeNotes(row.notes),
  };
};

const normalizeCategoryImages = (value: unknown): SizeGuideCategoryImages => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  const result: SizeGuideCategoryImages = {};
  for (const group of ["blazer", "trousers", "shirt", "shoes"] as SizeGuideGroup[]) {
    const src = normalizeString(obj[group]);
    if (src) result[group] = src;
  }
  return result;
};

export async function getSizeGuideSettings(): Promise<SizeGuideSettings> {
  const settings = await readPersistentJsonFile<Partial<SizeGuideSettings>>(SIZE_GUIDES_PATH, DEFAULT_SIZE_GUIDE_SETTINGS);
  const tables = Array.isArray(settings.tables)
    ? settings.tables
        .map((item, index) => normalizeTable(item, index))
        .filter((item): item is SizeGuideTable => Boolean(item))
    : DEFAULT_SIZE_GUIDE_SETTINGS.tables;

  return {
    updatedAt: normalizeString(settings.updatedAt) || DEFAULT_SIZE_GUIDE_SETTINGS.updatedAt,
    imageSrc:
      settings.imageSrc === null
        ? null
        : normalizeString(settings.imageSrc) || DEFAULT_SIZE_GUIDE_SETTINGS.imageSrc,
    imageAlt: normalizeString(settings.imageAlt) || DEFAULT_SIZE_GUIDE_SETTINGS.imageAlt,
    categoryImages: normalizeCategoryImages(settings.categoryImages),
    tables: tables.length ? tables : DEFAULT_SIZE_GUIDE_SETTINGS.tables,
  };
}

export async function updateSizeGuideSettings(
  patch: Partial<SizeGuideSettings>,
): Promise<SizeGuideSettings> {
  const current = await getSizeGuideSettings();
  const next: SizeGuideSettings = {
    updatedAt: patch.updatedAt === null ? null : normalizeString(patch.updatedAt) || nowIso(),
    imageSrc: patch.imageSrc === null ? null : normalizeString(patch.imageSrc) || current.imageSrc,
    imageAlt: normalizeString(patch.imageAlt) || current.imageAlt,
    categoryImages: patch.categoryImages !== undefined ? normalizeCategoryImages(patch.categoryImages) : (current.categoryImages ?? {}),
    tables: Array.isArray(patch.tables)
      ? patch.tables
          .map((item, index) => normalizeTable(item, index))
          .filter((item): item is SizeGuideTable => Boolean(item))
      : current.tables,
  };

  await writePersistentJsonFile(SIZE_GUIDES_PATH, next);
  return next;
}

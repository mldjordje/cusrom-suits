import { parse } from "path";

const stripBom = (input: string) => (input.charCodeAt(0) === 0xfeff ? input.slice(1) : input);

const normalizeDecimal = (value: string) => value.replace(/\./g, "").replace(",", ".");

const maybeNumber = (value: string): string | number => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^-?\d+(,\d+)?$/.test(trimmed)) {
    const n = Number.parseFloat(normalizeDecimal(trimmed));
    if (Number.isFinite(n)) return n;
  }
  return trimmed;
};

export function parseLegacyCsv(csvText: string) {
  const raw = stripBom(csvText || "");
  const rows: (string | number)[][] = [];
  let current: (string | number)[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    current.push(maybeNumber(field));
    field = "";
  };

  const pushRow = () => {
    if (current.length === 0 && field.length === 0) return;
    pushField();
    rows.push(current);
    current = [];
  };

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      field += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      pushField();
      continue;
    }
    if (char === "\n") {
      if (field.endsWith("\r")) field = field.slice(0, -1);
      pushRow();
      continue;
    }
    field += char;
  }

  if (current.length || field.length) {
    pushRow();
  }

  return rows;
}

export function toLegacyCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((row) =>
      row
        .map((entry) => {
          const value = entry == null ? "" : String(entry);
          if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
          return value;
        })
        .join(","),
    )
    .join("\r\n");
}

export const fileBaseName = (fileName: string) => parse(fileName).name.toLowerCase();


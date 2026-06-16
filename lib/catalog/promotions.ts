import { revalidateTag } from "next/cache";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";
import { getAnonSupabase, getServiceSupabase } from "@/lib/supabase/server";
import type { CatalogProductView } from "@/lib/catalog/store";

const PROMOTION_RULES_PATH = "data/webshop-promotion-rules.json";
export const PROMOTION_RULES_CACHE_TAG = "catalog-promotion-rules";
const PROMOTION_STORAGE_BUCKET = process.env.SUPABASE_CONFIG_BUCKET || "site-config";
const PROMOTION_STORAGE_PATH = "webshop/promotion-rules.json";

export type PromotionScopeType = "all" | "category" | "brand" | "product";
export type PromotionDiscountType = "percent" | "fixed";

export type PromotionRule = {
  id: string;
  name: string;
  isActive: boolean;
  scopeType: PromotionScopeType;
  scopeValues: Array<number | string>;
  discountType: PromotionDiscountType;
  discountValue: number;
  priority: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PromotionRuleInput = {
  name: string;
  isActive?: boolean;
  scopeType: PromotionScopeType;
  scopeValues?: Array<number | string>;
  discountType: PromotionDiscountType;
  discountValue: number;
  priority?: number;
  startAt?: string | null;
  endAt?: string | null;
};

export type PromotionRulePatch = Partial<PromotionRuleInput>;

type PromotionRuleRaw = Record<string, unknown>;

type SupabaseClient = NonNullable<ReturnType<typeof getServiceSupabase>>;

const isScopeType = (value: string): value is PromotionScopeType =>
  value === "all" || value === "category" || value === "brand" || value === "product";

const isDiscountType = (value: string): value is PromotionDiscountType =>
  value === "percent" || value === "fixed";

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toIsoOrNull = (value: unknown) => {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
};

const unique = <T>(arr: T[]) => Array.from(new Set(arr));

const normalizeScopeValues = (scopeType: PromotionScopeType, values: unknown): Array<number | string> => {
  const rawList = Array.isArray(values) ? values : [];
  if (scopeType === "all") return [];

  if (scopeType === "category" || scopeType === "product") {
    return unique(
      rawList
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Number(value)),
    );
  }

  return unique(
    rawList
      .map((value) => String(value || "").trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
};

const normalizeRule = (raw: unknown): PromotionRule | null => {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as PromotionRuleRaw;
  const id = String(row.id || "").trim();
  const name = String(row.name || "").trim();
  const scopeTypeRaw = String(row.scopeType || "all");
  const discountTypeRaw = String(row.discountType || "percent");
  const discountValueRaw = toNumber(row.discountValue);
  const priorityRaw = toNumber(row.priority);
  const createdAt = toIsoOrNull(row.createdAt);
  const updatedAt = toIsoOrNull(row.updatedAt);

  if (!id || !name || !isScopeType(scopeTypeRaw) || !isDiscountType(discountTypeRaw) || discountValueRaw == null) {
    return null;
  }

  const discountValue =
    discountTypeRaw === "percent"
      ? Math.max(0, Math.min(100, discountValueRaw))
      : Math.max(0, Number(discountValueRaw.toFixed(2)));

  return {
    id,
    name,
    isActive: row.isActive == null ? true : Boolean(row.isActive),
    scopeType: scopeTypeRaw,
    scopeValues: normalizeScopeValues(scopeTypeRaw, row.scopeValues),
    discountType: discountTypeRaw,
    discountValue,
    priority: priorityRaw == null ? 0 : Math.round(priorityRaw),
    startAt: toIsoOrNull(row.startAt),
    endAt: toIsoOrNull(row.endAt),
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
  };
};

const sortRules = (rules: PromotionRule[]) =>
  [...rules].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

const normalizeRulesArray = (rules: unknown) =>
  sortRules(
    (Array.isArray(rules) ? rules : [])
      .map(normalizeRule)
      .filter((rule): rule is PromotionRule => Boolean(rule)),
  );

const ensureStorageBucket = async (supabase: SupabaseClient) => {
  try {
    const { data } = await supabase.storage.getBucket(PROMOTION_STORAGE_BUCKET);
    if (data) return true;
    const { error } = await supabase.storage.createBucket(PROMOTION_STORAGE_BUCKET, {
      public: false,
    });
    return !error;
  } catch {
    return false;
  }
};

const readRulesFromSupabaseStorage = async (): Promise<PromotionRule[] | null> => {
  const supabase = getServiceSupabase() || getAnonSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.storage
      .from(PROMOTION_STORAGE_BUCKET)
      .download(PROMOTION_STORAGE_PATH);

    if (error || !data) return null;
    const raw = JSON.parse(await data.text());
    return normalizeRulesArray(raw);
  } catch {
    return null;
  }
};

const writeRulesToSupabaseStorage = async (rules: PromotionRule[]) => {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  await ensureStorageBucket(supabase);
  try {
    const payload = Buffer.from(JSON.stringify(sortRules(rules), null, 2), "utf8");
    const { error } = await supabase.storage
      .from(PROMOTION_STORAGE_BUCKET)
      .upload(PROMOTION_STORAGE_PATH, payload, {
        upsert: true,
        contentType: "application/json; charset=utf-8",
      });
    return !error;
  } catch {
    return false;
  }
};

const readRules = async () => {
  const storageRules = await readRulesFromSupabaseStorage();
  if (storageRules) return storageRules;

  const fileRules = normalizeRulesArray(
    await readJsonFile<unknown[]>(PROMOTION_RULES_PATH, []),
  );

  // Always write back so the file exists in storage and future reads don't 400.
  await writeRulesToSupabaseStorage(fileRules);

  return fileRules;
};

const writeRules = async (rules: PromotionRule[]) => {
  const normalizedRules = sortRules(rules);
  const wroteToStorage = await writeRulesToSupabaseStorage(normalizedRules);

  try {
    await writeJsonFile(PROMOTION_RULES_PATH, normalizedRules);
  } catch {
    // Local file sync is best-effort only.
  }

  if (!wroteToStorage && normalizedRules.length >= 0) {
    await writeJsonFile(PROMOTION_RULES_PATH, normalizedRules);
  }
};

const createRuleId = () => `promo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeInput = (input: PromotionRuleInput, existing?: PromotionRule): PromotionRule => {
  const now = new Date().toISOString();
  const scopeType = input.scopeType ?? existing?.scopeType ?? "all";
  const discountType = input.discountType ?? existing?.discountType ?? "percent";
  const rawDiscountValue = toNumber(input.discountValue ?? existing?.discountValue ?? 0) ?? 0;
  const discountValue =
    discountType === "percent"
      ? Math.max(0, Math.min(100, rawDiscountValue))
      : Math.max(0, Number(rawDiscountValue.toFixed(2)));

  return {
    id: existing?.id || createRuleId(),
    name: String(input.name ?? existing?.name ?? "").trim() || "Akcija",
    isActive: input.isActive ?? existing?.isActive ?? true,
    scopeType,
    scopeValues: normalizeScopeValues(scopeType, input.scopeValues ?? existing?.scopeValues ?? []),
    discountType,
    discountValue,
    priority: Math.round(toNumber(input.priority ?? existing?.priority ?? 0) ?? 0),
    startAt: toIsoOrNull(input.startAt ?? existing?.startAt ?? null),
    endAt: toIsoOrNull(input.endAt ?? existing?.endAt ?? null),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
};

export async function listPromotionRules() {
  return readRules();
}

export async function createPromotionRule(input: PromotionRuleInput) {
  const rules = await readRules();
  const rule = normalizeInput(input);
  rules.unshift(rule);
  await writeRules(rules);
  return rule;
}

export async function updatePromotionRule(ruleId: string, patch: PromotionRulePatch) {
  const rules = await readRules();
  const index = rules.findIndex((rule) => rule.id === ruleId);
  if (index < 0) return null;
  const current = rules[index];
  const next = normalizeInput(
    {
      name: patch.name ?? current.name,
      isActive: patch.isActive ?? current.isActive,
      scopeType: patch.scopeType ?? current.scopeType,
      scopeValues: patch.scopeValues ?? current.scopeValues,
      discountType: patch.discountType ?? current.discountType,
      discountValue: patch.discountValue ?? current.discountValue,
      priority: patch.priority ?? current.priority,
      startAt: patch.startAt ?? current.startAt,
      endAt: patch.endAt ?? current.endAt,
    },
    current,
  );
  rules[index] = next;
  await writeRules(rules);
  return next;
}

export async function deletePromotionRule(ruleId: string) {
  const rules = await readRules();
  const next = rules.filter((rule) => rule.id !== ruleId);
  if (next.length === rules.length) return false;
  await writeRules(next);
  return true;
}

export function invalidatePromotionRuleCaches() {
  revalidateTag(PROMOTION_RULES_CACHE_TAG);
}

export function isRuleActiveNow(rule: PromotionRule, at = new Date()) {
  if (!rule.isActive) return false;
  const now = at.getTime();
  const start = rule.startAt ? new Date(rule.startAt).getTime() : null;
  const end = rule.endAt ? new Date(rule.endAt).getTime() : null;
  if (start != null && now < start) return false;
  if (end != null && now > end) return false;
  return true;
}

const matchesRule = (rule: PromotionRule, product: CatalogProductView) => {
  if (rule.scopeType === "all") return true;
  if (rule.scopeType === "category") {
    const ids = new Set(
      rule.scopeValues
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    );
    return product.categories.some((cat) => ids.has(cat.id));
  }
  if (rule.scopeType === "product") {
    const ids = new Set(
      rule.scopeValues
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    );
    return ids.has(product.legacyId);
  }
  const brands = new Set(rule.scopeValues.map((value) => String(value).toLowerCase()));
  const productBrand = String(product.brand || "").trim().toLowerCase();
  return productBrand.length > 0 && brands.has(productBrand);
};

const computeCandidate = (product: CatalogProductView, rule: PromotionRule) => {
  const gross = Math.max(0, Number(product.priceGross || 0));
  const nextFinal =
    rule.discountType === "percent"
      ? Math.max(0, Number((gross * (1 - rule.discountValue / 100)).toFixed(2)))
      : Math.max(0, Number((gross - rule.discountValue).toFixed(2)));

  const nextRebate =
    gross <= 0
      ? 0
      : Math.max(0, Math.min(100, Number((((gross - nextFinal) / gross) * 100).toFixed(2))));

  return { nextFinal, nextRebate };
};

const pickBestRule = (product: CatalogProductView, rules: PromotionRule[]) => {
  const activeMatching = sortRules(rules).filter((rule) => matchesRule(rule, product));
  if (!activeMatching.length) return null;

  const first = activeMatching[0];
  let best = { rule: first, ...computeCandidate(product, first) };

  for (const rule of activeMatching.slice(1)) {
    const candidate = computeCandidate(product, rule);
    if (rule.priority > best.rule.priority) {
      best = { rule, ...candidate };
      continue;
    }
    if (rule.priority === best.rule.priority && candidate.nextFinal < best.nextFinal) {
      best = { rule, ...candidate };
    }
  }

  return best;
};

export function applyPromotionRulesToProduct(
  product: CatalogProductView,
  rules: PromotionRule[],
  at = new Date(),
): CatalogProductView {
  const activeRules = rules.filter((rule) => isRuleActiveNow(rule, at));
  if (!activeRules.length) return product;

  const best = pickBestRule(product, activeRules);
  if (!best) return product;

  return {
    ...product,
    priceFinalGross: best.nextFinal,
    rebatePercent: best.nextRebate,
    rawPayload: {
      ...product.rawPayload,
      activePromotion: {
        ruleId: best.rule.id,
        ruleName: best.rule.name,
        discountType: best.rule.discountType,
        discountValue: best.rule.discountValue,
      },
    },
  };
}

export function applyPromotionRulesToProducts(
  products: CatalogProductView[],
  rules: PromotionRule[],
  at = new Date(),
) {
  return products.map((item) => applyPromotionRulesToProduct(item, rules, at));
}

export function countPromotionImpactedProducts(
  products: CatalogProductView[],
  rules: PromotionRule[],
  at = new Date(),
) {
  if (!rules.length || !products.length) return 0;
  let impacted = 0;
  for (const item of products) {
    const next = applyPromotionRulesToProduct(item, rules, at);
    if (Number(next.priceFinalGross) !== Number(item.priceFinalGross) || Number(next.rebatePercent) !== Number(item.rebatePercent)) {
      impacted += 1;
    }
  }
  return impacted;
}

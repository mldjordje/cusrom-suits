import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { invalidateCatalogCaches } from "@/lib/catalog/store";
import {
  createPromotionRule,
  invalidatePromotionRuleCaches,
  listPromotionRules,
  type PromotionDiscountType,
  type PromotionRuleInput,
  type PromotionScopeType,
} from "@/lib/catalog/promotions";

const parseScopeType = (value: unknown): PromotionScopeType | null => {
  const scope = String(value || "");
  if (scope === "all" || scope === "category" || scope === "brand" || scope === "product") return scope;
  return null;
};

const parseDiscountType = (value: unknown): PromotionDiscountType | null => {
  const discount = String(value || "");
  if (discount === "percent" || discount === "fixed") return discount;
  return null;
};

const parseScopeValues = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "number" || typeof item === "string" ? item : null))
    .filter((item): item is number | string => item != null);
};

type ParseFailure = { message: string };

const parseCreatePayload = (raw: unknown): PromotionRuleInput | ParseFailure => {
  if (!raw || typeof raw !== "object") return { message: "Invalid promotion payload." };
  const row = raw as Record<string, unknown>;
  const name = String(row.name || "").trim();
  const scopeType = parseScopeType(row.scopeType);
  const discountType = parseDiscountType(row.discountType);
  const discountValue = Number(row.discountValue);
  if (!name || !scopeType || !discountType || !Number.isFinite(discountValue)) {
    return { message: "Invalid promotion payload." };
  }

  const scopeValues = parseScopeValues(row.scopeValues);

  /* Two ways a rule ends up discounting the whole catalogue: asking for it, and
     naming a scope without ever saying which categories. The first needs an
     explicit confirmation from the admin UI; the second is always a mistake.
     The shop had a 30%-off-everything day because neither was checked here. */
  if (scopeType === "all" && row.confirmAllProducts !== true) {
    return {
      message:
        "Popust na sve artikle mora biti potvrdjen (confirmAllProducts). Za jednu grupu koristi scope 'category'.",
    };
  }
  if (scopeType !== "all" && scopeValues.length === 0) {
    return { message: `Scope '${scopeType}' zahteva bar jednu vrednost.` };
  }

  return {
    name,
    isActive: row.isActive == null ? true : Boolean(row.isActive),
    scopeType,
    scopeValues,
    discountType,
    discountValue,
    priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : 0,
    startAt: row.startAt == null ? null : String(row.startAt),
    endAt: row.endAt == null ? null : String(row.endAt),
  };
};

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const data = await listPromotionRules();
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = parseCreatePayload(payload);
  if ("message" in parsed) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }

  const rule = await createPromotionRule(parsed);
  invalidatePromotionRuleCaches();
  invalidateCatalogCaches();
  return NextResponse.json({ success: true, rule });
}

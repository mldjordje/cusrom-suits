import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import {
  createPromotionRule,
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

const parseCreatePayload = (raw: unknown): PromotionRuleInput | null => {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name || "").trim();
  const scopeType = parseScopeType(row.scopeType);
  const discountType = parseDiscountType(row.discountType);
  const discountValue = Number(row.discountValue);
  if (!name || !scopeType || !discountType || !Number.isFinite(discountValue)) return null;

  return {
    name,
    isActive: row.isActive == null ? true : Boolean(row.isActive),
    scopeType,
    scopeValues: parseScopeValues(row.scopeValues),
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
  if (!parsed) {
    return NextResponse.json({ success: false, message: "Invalid promotion payload." }, { status: 400 });
  }

  const rule = await createPromotionRule(parsed);
  return NextResponse.json({ success: true, rule });
}

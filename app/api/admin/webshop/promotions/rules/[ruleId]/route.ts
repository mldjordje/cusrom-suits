import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { invalidateCatalogCaches } from "@/lib/catalog/store";
import {
  deletePromotionRule,
  invalidatePromotionRuleCaches,
  updatePromotionRule,
  type PromotionDiscountType,
  type PromotionRulePatch,
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

const parsePatchPayload = (raw: unknown): PromotionRulePatch | ParseFailure => {
  if (!raw || typeof raw !== "object") return { message: "Invalid patch payload." };
  const row = raw as Record<string, unknown>;
  const patch: PromotionRulePatch = {};

  if (Object.prototype.hasOwnProperty.call(row, "name")) patch.name = String(row.name || "").trim();
  if (Object.prototype.hasOwnProperty.call(row, "isActive")) patch.isActive = Boolean(row.isActive);
  if (Object.prototype.hasOwnProperty.call(row, "scopeType")) {
    const scopeType = parseScopeType(row.scopeType);
    if (!scopeType) return { message: "Invalid patch payload." };
    /* Widening an existing rule to the whole catalogue is the same decision as
       creating one that way, so it needs the same explicit confirmation. */
    if (scopeType === "all" && row.confirmAllProducts !== true) {
      return {
        message:
          "Popust na sve artikle mora biti potvrdjen (confirmAllProducts). Za jednu grupu koristi scope 'category'.",
      };
    }
    patch.scopeType = scopeType;
  }
  if (Object.prototype.hasOwnProperty.call(row, "scopeValues")) patch.scopeValues = parseScopeValues(row.scopeValues);
  if (Object.prototype.hasOwnProperty.call(row, "discountType")) {
    const discountType = parseDiscountType(row.discountType);
    if (!discountType) return { message: "Invalid patch payload." };
    patch.discountType = discountType;
  }
  if (Object.prototype.hasOwnProperty.call(row, "discountValue")) {
    const discountValue = Number(row.discountValue);
    if (!Number.isFinite(discountValue)) return { message: "Invalid patch payload." };
    patch.discountValue = discountValue;
  }
  if (Object.prototype.hasOwnProperty.call(row, "priority")) {
    const priority = Number(row.priority);
    if (!Number.isFinite(priority)) return { message: "Invalid patch payload." };
    patch.priority = priority;
  }
  if (Object.prototype.hasOwnProperty.call(row, "startAt")) {
    patch.startAt = row.startAt == null ? null : String(row.startAt);
  }
  if (Object.prototype.hasOwnProperty.call(row, "endAt")) {
    patch.endAt = row.endAt == null ? null : String(row.endAt);
  }

  return patch;
};

type Params = {
  params: Promise<{ ruleId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { ruleId } = await params;
  const payload = await req.json().catch(() => null);
  const patch = parsePatchPayload(payload);
  if ("message" in patch) {
    return NextResponse.json({ success: false, message: patch.message }, { status: 400 });
  }

  const rule = await updatePromotionRule(String(ruleId), patch);
  if (!rule) {
    return NextResponse.json({ success: false, message: "Promotion rule not found." }, { status: 404 });
  }
  invalidatePromotionRuleCaches();
  invalidateCatalogCaches();
  return NextResponse.json({ success: true, rule });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { ruleId } = await params;
  const removed = await deletePromotionRule(String(ruleId));
  if (!removed) {
    return NextResponse.json({ success: false, message: "Promotion rule not found." }, { status: 404 });
  }
  invalidatePromotionRuleCaches();
  invalidateCatalogCaches();
  return NextResponse.json({ success: true });
}

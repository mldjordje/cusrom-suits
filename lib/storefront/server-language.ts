import { cookies } from "next/headers";
import {
  STOREFRONT_LANGUAGE_COOKIE,
  StorefrontSearchParams,
  firstStorefrontParam,
  normalizeStorefrontLanguage,
} from "@/lib/storefront/language";

export async function resolveStorefrontLanguage(
  searchParams?: StorefrontSearchParams,
) {
  const explicit = firstStorefrontParam(searchParams?.lang);
  if (explicit) {
    return normalizeStorefrontLanguage(explicit);
  }

  const cookieStore = await cookies();
  return normalizeStorefrontLanguage(
    cookieStore.get(STOREFRONT_LANGUAGE_COOKIE)?.value,
  );
}

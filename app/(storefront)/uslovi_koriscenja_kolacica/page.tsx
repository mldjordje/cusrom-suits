import LegalPageView, { getLegalPageMetadata } from "@/app/components/storefront/LegalPageView";

export const metadata = getLegalPageMetadata("uslovi_koriscenja_kolacica");

export default async function CookiePolicyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LegalPageView slug="uslovi_koriscenja_kolacica" searchParams={searchParams} />;
}


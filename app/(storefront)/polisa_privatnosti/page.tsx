import LegalPageView, { getLegalPageMetadata } from "@/app/components/storefront/LegalPageView";

export const metadata = getLegalPageMetadata("polisa_privatnosti");

export default async function PrivacyPolicyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LegalPageView slug="polisa_privatnosti" searchParams={searchParams} />;
}


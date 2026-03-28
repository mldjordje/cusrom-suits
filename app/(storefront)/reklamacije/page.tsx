import LegalPageView, { getLegalPageMetadata } from "@/app/components/storefront/LegalPageView";

export const metadata = getLegalPageMetadata("reklamacije");

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LegalPageView slug="reklamacije" searchParams={searchParams} />;
}


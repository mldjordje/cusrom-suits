import LegalPageView, { getLegalPageMetadata } from "@/app/components/storefront/LegalPageView";

export const metadata = getLegalPageMetadata("isporuka");

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LegalPageView slug="isporuka" searchParams={searchParams} />;
}


import LegalPageView, { getLegalPageMetadata } from "@/app/components/storefront/LegalPageView";

export const metadata = getLegalPageMetadata("nacinplacanja");

export default async function PaymentMethodPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LegalPageView slug="nacinplacanja" searchParams={searchParams} />;
}

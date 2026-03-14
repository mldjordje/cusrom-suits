import { redirect } from "next/navigation";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export const metadata = {
  title: "Akcije | Santos & Santorini",
  description: "Aktuelni proizvodi na akciji u web shopu.",
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  redirect(lang === "en" ? "/web-shop?onSale=1&lang=en" : "/web-shop?onSale=1");
}

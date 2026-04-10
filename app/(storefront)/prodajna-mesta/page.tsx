import { redirect } from "next/navigation";

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lang = Array.isArray(params.lang) ? params.lang[0] : params.lang;
  redirect(lang === "en" ? "/kontakt?lang=en" : "/kontakt");
}

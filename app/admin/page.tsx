import Link from "next/link";
import { getVercelAnalyticsOverview } from "@/lib/analytics/vercel";
import { listCatalogProducts } from "@/lib/catalog/store";
import { listPosts } from "@/lib/blog/store";
import { listContactMessages } from "@/lib/contact/messages";
import { listSyncRuns } from "@/lib/integrations/core/store";
import { listNewsletterSubscribers } from "@/lib/newsletter/store";
import { listRecentOrders } from "@/lib/orders/store";

const cards = [
  { href: "/admin/webshop", title: "Web Shop Hub", desc: "Proizvodi, lager i centralni workflow.", tag: "CORE" },
  { href: "/admin/landing", title: "Pocetna i sekcije", desc: "Sekcije landinga i raspored proizvoda na home.", tag: "CONTENT" },
  { href: "/admin/webshop?tab=akcije", title: "Akcije i snizenja", desc: "Rucne akcije i automatska promo pravila.", tag: "SALES" },
  { href: "/admin/tutorial", title: "Tutorial", desc: "Objasnjenje kako rade web shop, lager, porudzbine i Ananas.", tag: "GUIDE" },
  { href: "/admin/sync", title: "Sync status", desc: "Moffice/lager zdravlje, cron provera i logovi.", tag: "SYNC" },
  { href: "/admin/integrations", title: "Integracije", desc: "Ananas + lager manual run i retry.", tag: "OPS" },
  { href: "/admin/orders", title: "Porudzbine", desc: "Pregled porudzbina i statusa.", tag: "SALES" },
  { href: "/admin/contact-messages", title: "Kontakt poruke", desc: "Inbox poruka sa landing i kontakt forme.", tag: "CRM" },
  { href: "/admin/newsletter", title: "Newsletter", desc: "Email prijave sa javnog sajta.", tag: "CRM" },
  { href: "/admin/blog-posts", title: "Blog Posts", desc: "Blog i vesti za storefront.", tag: "CONTENT" },
  { href: "/admin/fabrics", title: "Fabrics", desc: "Tkanine i asseti iz konfiguracionog dela.", tag: "CATALOG" },
  { href: "/admin/buttons", title: "Buttons", desc: "Upload dugmadi i propratnih asseta.", tag: "ASSETS" },
];

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sr-RS");
};

const isWithinDays = (value: string | null | undefined, days: number) => {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
};

export default async function AdminHome() {
  const [catalogStorefront, catalogRaw, posts, runs, orders, contacts, newsletter] = await Promise.all([
    listCatalogProducts({ page: 1, pageSize: 1, activeOnly: true, exportOnly: true, collapseBySku: false }),
    listCatalogProducts({ page: 1, pageSize: 1, activeOnly: false, exportOnly: false, collapseBySku: false }),
    listPosts({ page: 1, pageSize: 1, type: "all", onlyPublished: false }),
    listSyncRuns(6),
    listRecentOrders(200),
    listContactMessages(),
    listNewsletterSubscribers(),
  ]);
  const analytics = getVercelAnalyticsOverview();
  const analyticsStats = [
    { label: "Porudzbine 7 dana", value: orders.filter((item) => isWithinDays(item.created_at, 7)).length, hint: "checkout / upit sa webshop-a" },
    { label: "Kontakt upiti 7 dana", value: contacts.filter((item) => isWithinDays(item.createdAt, 7)).length, hint: "kontakt i landing forme" },
    { label: "Newsletter 30 dana", value: newsletter.filter((item) => isWithinDays(item.createdAt, 30)).length, hint: "nove prijave" },
    { label: "Pending porudzbine", value: orders.filter((item) => String(item.status || "").toLowerCase() === "pending").length, hint: "cekaju obradu" },
  ];
  const trackedEvents = ["order_submitted", "contact_submitted", "newsletter_subscribed"];

  const stats = [
    {
      label: "Storefront proizvodi",
      value: catalogStorefront.total,
      hint: `${catalogStorefront.categories.length} kategorija / ${catalogRaw.total} ukupno u katalogu`,
    },
    { label: "Objave", value: posts.total, hint: "blog + vesti" },
    { label: "Porudzbine", value: orders.length, hint: "lokalni/supabase izvori" },
    { label: "Kontakt poruke", value: contacts.length, hint: "landing i kontakt forma" },
    { label: "Newsletter", value: newsletter.length, hint: "pretplatnici" },
    { label: "Sync runovi", value: runs.length, hint: "poslednji zapisi" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Admin pregled</h1>
        <p className="mt-1 text-sm text-slate-600">Stanje sadrzaja, poruka, porudzbina i integracija na jednom mestu.</p>
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Brzi start</p>
          <p className="mt-1 text-sm text-blue-900">
            Ako je timu nejasno gde se podesi akcija, pocetna ili lager, krenite od tutorial strane pa zatim u Web Shop Hub.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/admin/tutorial" className="rounded-full border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
              Otvori tutorial
            </Link>
            <Link href="/admin/webshop" className="rounded-full border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
              Otvori web shop hub
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-600">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analytics</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Vercel analytics overview</h2>
              <p className="mt-1 text-sm text-slate-600">
                Pageview i route analitika ide u Vercel Analytics, a ovde su glavni poslovni signali iz aplikacije.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={analytics.dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
              >
                Otvori Vercel analytics
              </Link>
              <Link
                href={analytics.productionUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700"
              >
                Otvori produkciju
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {analyticsStats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-600">{stat.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tracking status</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Sta je povezano</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">Pageview tracking</p>
              <p className="mt-1 text-slate-600">
                {analytics.pageviewTrackingEnabled ? "Aktivan preko storefront layout-a." : "Nije aktivan."}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">Custom eventi</p>
              <p className="mt-1 text-slate-600">
                {analytics.customEventsConfigured
                  ? "Porudzbine, kontakt i newsletter salju server evente kada hosting plan to podrzava."
                  : "Custom event tracking nije povezan."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {trackedEvents.map((event) => (
                  <span key={event} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {event}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">Dashboard link</p>
              <p className="mt-1 text-slate-600">
                {analytics.dashboardUrl === "https://vercel.com/dashboard"
                  ? "Ako zelis direktan shortcut do projekta, postavi env `VERCEL_ANALYTICS_DASHBOARD_URL`."
                  : analytics.dashboardUrl}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sync</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Poslednje integracije</h2>
            </div>
            <Link href="/admin/integrations" className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline">
              Otvori integracije
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {runs.length ? (
              runs.map((run: any) => (
                <article key={run.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{run.type || run.channel || "Sync run"}</p>
                    <span className="text-xs text-slate-500">
                      {formatDate(run.startedAt || run.createdAt || run.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Status: {run.status || "unknown"}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-500">Nema zabelezenih sync runova.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Inbox</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Najnoviji signali</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">Kontakt poruke</p>
              <p className="mt-1 text-slate-600">{contacts.length ? `Poslednja poruka: ${formatDate(contacts[0]?.createdAt)}` : "Nema poruka."}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">Newsletter</p>
              <p className="mt-1 text-slate-600">
                {newsletter.length ? `Poslednja prijava: ${formatDate(newsletter[0]?.createdAt)}` : "Jos nema prijava."}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">Porudzbine</p>
              <p className="mt-1 text-slate-600">
                {orders.length ? `Poslednja porudzbina: ${formatDate(orders[0]?.created_at)}` : "Nema porudzbina."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="mb-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
              {card.tag}
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

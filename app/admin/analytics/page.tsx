import Link from "next/link";
import { listContactMessages } from "@/lib/contact/messages";
import { listNewsletterSubscribers } from "@/lib/newsletter/store";
import { listRecentOrders, type StoredOrder } from "@/lib/orders/store";
import { getVercelAnalyticsOverview } from "@/lib/analytics/vercel";
import {
  ANALYTICS_RANGE_OPTIONS,
  getVercelAnalyticsReport,
  parseAnalyticsRange,
  type AnalyticsBreakdownItem,
  type AnalyticsEventItem,
  type AnalyticsTrendItem,
} from "@/lib/analytics/vercelApi";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const numberFormatter = new Intl.NumberFormat("sr-RS");
const moneyFormatter = new Intl.NumberFormat("sr-RS", {
  style: "currency",
  currency: "RSD",
  maximumFractionDigits: 0,
});
const countryNames = new Intl.DisplayNames(["sr-Latn"], { type: "region" });

const formatNumber = (value: number) => numberFormatter.format(Math.round(value));
const formatMoney = (value: number) => moneyFormatter.format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));

const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const isInside = (value: string | null | undefined, since: string, until: string) => {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return timestamp >= new Date(since).getTime() && timestamp <= new Date(until).getTime();
};

const isRevenueOrder = (order: StoredOrder) =>
  !["cancelled", "canceled", "otkazano"].includes(String(order.status || "").toLowerCase());

function Delta({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous);
  const positive = change >= 0;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
        positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
      title={`Prethodni period: ${formatNumber(previous)}`}
    >
      {positive ? "+" : ""}
      {change.toLocaleString("sr-RS", { maximumFractionDigits: 1 })}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  hint,
  current,
  previous,
  accent = "slate",
}: {
  label: string;
  value: string;
  hint: string;
  current?: number;
  previous?: number;
  accent?: "slate" | "blue" | "emerald" | "violet";
}) {
  const accentClasses = {
    slate: "from-slate-900 to-slate-700",
    blue: "from-blue-700 to-sky-500",
    emerald: "from-emerald-700 to-teal-500",
    violet: "from-violet-700 to-fuchsia-500",
  };

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentClasses[accent]}`} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        {current !== undefined && previous !== undefined ? (
          <Delta current={current} previous={previous} />
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{hint}</p>
    </article>
  );
}

function TrendChart({ data }: { data: AnalyticsTrendItem[] }) {
  if (!data.length) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Trend će se pojaviti čim Vercel API vrati podatke za izabrani period.
      </div>
    );
  }

  const max = Math.max(...data.map((item) => item.pageviews), 1);
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="flex h-64 min-w-[680px] items-end gap-1.5 border-b border-slate-200 px-1"
        role="img"
        aria-label="Dnevni trend pregleda stranica i posetilaca"
      >
        {data.map((item, index) => {
          const pageviewHeight = Math.max(3, (item.pageviews / max) * 100);
          const visitorHeight = Math.max(2, (item.visitors / max) * 100);
          return (
            <div key={`${item.date}-${index}`} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
              <div className="relative flex h-[210px] items-end justify-center">
                <div
                  className="absolute bottom-0 w-full max-w-7 rounded-t-md bg-blue-100 transition group-hover:bg-blue-200"
                  style={{ height: `${pageviewHeight}%` }}
                />
                <div
                  className="absolute bottom-0 w-2/3 max-w-4 rounded-t-md bg-blue-600 transition group-hover:bg-blue-700"
                  style={{ height: `${visitorHeight}%` }}
                />
                <span className="pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:block">
                  {formatShortDate(item.date)} · {formatNumber(item.pageviews)} pregleda ·{" "}
                  {formatNumber(item.visitors)} posetilaca
                </span>
              </div>
              <span className="mt-2 h-5 text-center text-[10px] text-slate-500">
                {index % labelStep === 0 || index === data.length - 1
                  ? formatShortDate(item.date)
                  : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-100 ring-1 ring-blue-200" />
          Pregledi
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
          Posetioci
        </span>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  subtitle,
  items,
  mapLabel,
}: {
  title: string;
  subtitle: string;
  items: AnalyticsBreakdownItem[];
  mapLabel?: (value: string) => string;
}) {
  const max = Math.max(...items.map((item) => item.pageviews), 1);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-5 space-y-4">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${item.key}-${index}`}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-800" title={item.key}>
                  {mapLabel ? mapLabel(item.key) : item.key}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-950">
                  {formatNumber(item.pageviews)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-700 to-sky-400"
                  style={{ width: `${Math.max(2, (item.pageviews / max) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatNumber(item.visitors)} jedinstvenih posetilaca
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Nema podataka za izabrani period.
          </p>
        )}
      </div>
    </section>
  );
}

function EventsCard({ items }: { items: AnalyticsEventItem[] }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
        Custom događaji
      </p>
      <h2 className="mt-1 text-xl font-bold text-slate-950">Akcije posetilaca</h2>
      <p className="mt-1 text-sm text-slate-500">
        Porudžbine, kontakt upiti, newsletter i ostali događaji poslati Vercelu.
      </p>
      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.key} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <code className="truncate text-xs font-semibold text-violet-700">{item.key}</code>
                <strong className="tabular-nums text-slate-950">{formatNumber(item.count)}</strong>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-50">
                <div
                  className="h-full rounded-full bg-violet-600"
                  style={{ width: `${Math.max(2, (item.count / max) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {formatNumber(item.visitors)} jedinstvenih posetilaca
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Još nema custom događaja u ovom periodu ili ih trenutni Vercel plan ne podržava.
          </p>
        )}
      </div>
    </section>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const days = parseAnalyticsRange(params.range);
  const analyticsOverview = getVercelAnalyticsOverview();
  const [report, orders, contacts, newsletter] = await Promise.all([
    getVercelAnalyticsReport(days),
    listRecentOrders(1000),
    listContactMessages(),
    listNewsletterSubscribers(),
  ]);

  const currentOrders = orders.filter((item) =>
    isInside(item.created_at, report.range.since, report.range.until),
  );
  const previousSince = new Date(report.range.since);
  previousSince.setUTCDate(previousSince.getUTCDate() - days);
  const previousSinceIso = previousSince.toISOString();
  const previousOrders = orders.filter((item) =>
    isInside(item.created_at, previousSinceIso, report.range.since),
  );
  const currentRevenue = currentOrders
    .filter(isRevenueOrder)
    .reduce((sum, item) => sum + Number(item.price || 0), 0);
  const previousRevenue = previousOrders
    .filter(isRevenueOrder)
    .reduce((sum, item) => sum + Number(item.price || 0), 0);
  const currentContacts = contacts.filter((item) =>
    isInside(item.createdAt, report.range.since, report.range.until),
  ).length;
  const previousContacts = contacts.filter((item) =>
    isInside(item.createdAt, previousSinceIso, report.range.since),
  ).length;
  const currentNewsletter = newsletter.filter((item) =>
    isInside(item.createdAt, report.range.since, report.range.until),
  ).length;
  const previousNewsletter = newsletter.filter((item) =>
    isInside(item.createdAt, previousSinceIso, report.range.since),
  ).length;
  const averageOrder = currentOrders.length ? currentRevenue / currentOrders.length : 0;
  const conversionRate = report.totals.visitors
    ? (currentOrders.length / report.totals.visitors) * 100
    : 0;
  const pagesPerVisitor = report.totals.visitors
    ? report.totals.pageviews / report.totals.visitors
    : 0;

  const dashboardUrl =
    analyticsOverview.dashboardUrl === "https://vercel.com/dashboard"
      ? "https://vercel.com/djordjes-projects-7892938d/custom-suits/analytics"
      : analyticsOverview.dashboardUrl;

  return (
    <div className="flex flex-col gap-6">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                Vercel Web Analytics
              </p>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                  report.status === "connected"
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : "border-amber-300/40 bg-amber-300/10 text-amber-200"
                }`}
              >
                {report.status === "connected" ? "Live podaci" : "Potrebno povezivanje"}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Analitika sajta
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Saobraćaj, publika, kanali, kampanje i prodajni rezultati na jednom mestu.
              Podaci o posetama dolaze direktno iz Vercel Analytics API-ja.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={dashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white/20"
            >
              Vercel dashboard ↗
            </Link>
            <Link
              href="https://vercel.com/djordjes-projects-7892938d/custom-suits/speed-insights"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white/20"
            >
              Brzina sajta ↗
            </Link>
            <Link
              href={analyticsOverview.productionUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-sky-100"
            >
              Otvori sajt ↗
            </Link>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
          <nav className="flex rounded-full border border-white/15 bg-black/20 p-1" aria-label="Period analitike">
            {ANALYTICS_RANGE_OPTIONS.map((option) => (
              <Link
                key={option}
                href={`/admin/analytics?range=${option}`}
                aria-current={days === option ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  days === option
                    ? "bg-white text-slate-950 shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {option} dana
              </Link>
            ))}
          </nav>
          <p className="text-xs text-slate-400">
            {formatDate(report.range.since)} — {formatDate(report.range.until)} · osveženo{" "}
            {new Date(report.generatedAt).toLocaleTimeString("sr-RS", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </header>

      {report.status !== "connected" ? (
        <section
          className={`rounded-2xl border p-5 ${
            report.status === "unconfigured"
              ? "border-amber-200 bg-amber-50"
              : "border-rose-200 bg-rose-50"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            {report.status === "unconfigured" ? "Jednokratna konfiguracija" : "Vercel API greška"}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">
            {report.status === "unconfigured"
            ? "Dodaj project-scoped Vercel token da se učitaju live podaci"
              : "Podaci trenutno nisu dostupni"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Kreiraj token ograničen na projekat <strong>custom-suits</strong>, pa u Vercel projektu
            dodaj secret environment varijablu{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-semibold">VERCEL_ANALYTICS_TOKEN</code>.
            Project i team ID su već povezani sa projektom, a token se koristi isključivo na serveru i
            nikada se ne šalje browseru.
          </p>
          {report.errors.length ? (
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              {report.errors.slice(0, 4).map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          ) : null}
          <Link
            href="https://vercel.com/account/settings/tokens"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800"
          >
            Kreiraj Vercel token ↗
          </Link>
        </section>
      ) : report.errors.length ? (
        <details className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <summary className="cursor-pointer font-semibold">
            Deo Vercel podataka nije učitan ({report.errors.length})
          </summary>
          <ul className="mt-3 space-y-1 text-xs">
            {report.errors.map((error) => (
              <li key={error}>• {error}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pregledi stranica"
          value={formatNumber(report.totals.pageviews)}
          hint={`${pagesPerVisitor.toLocaleString("sr-RS", { maximumFractionDigits: 2 })} stranica po posetiocu`}
          current={report.totals.pageviews}
          previous={report.previousTotals.pageviews}
          accent="blue"
        />
        <KpiCard
          label="Jedinstveni posetioci"
          value={formatNumber(report.totals.visitors)}
          hint="Vercel privacy-friendly identifikacija"
          current={report.totals.visitors}
          previous={report.previousTotals.visitors}
          accent="violet"
        />
        <KpiCard
          label="Porudžbine"
          value={formatNumber(currentOrders.length)}
          hint={`${conversionRate.toLocaleString("sr-RS", { maximumFractionDigits: 2 })}% konverzija posetilac → porudžbina`}
          current={currentOrders.length}
          previous={previousOrders.length}
          accent="emerald"
        />
        <KpiCard
          label="Prihod"
          value={formatMoney(currentRevenue)}
          hint={`Prosečna porudžbina ${formatMoney(averageOrder)}`}
          current={currentRevenue}
          previous={previousRevenue}
          accent="slate"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Trend posećenosti
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Pregledi i posetioci po danu</h2>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Custom eventi
            </p>
            <p className="mt-0.5 font-bold text-slate-950">{formatNumber(report.totals.events)}</p>
          </div>
        </div>
        <div className="mt-6">
          <TrendChart data={report.trend} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Najposećenije stranice"
          subtitle="Putanje sa najviše pregleda"
          items={report.pages}
        />
        <BreakdownCard
          title="Izvori saobraćaja"
          subtitle="Sajtovi sa kojih posetioci dolaze"
          items={report.referrers}
          mapLabel={(value) =>
            value === "Direktan / nepoznat" || value === "(direct)" ? "Direktan dolazak" : value
          }
        />
        <BreakdownCard
          title="Države"
          subtitle="Geografska raspodela publike"
          items={report.countries}
          mapLabel={(value) => {
            try {
              return countryNames.of(value.toUpperCase()) || value;
            } catch {
              return value;
            }
          }}
        />
        <BreakdownCard
          title="Uređaji"
          subtitle="Desktop, telefon i tablet"
          items={report.devices}
        />
        <BreakdownCard
          title="Browseri"
          subtitle="Najčešći internet pregledači"
          items={report.browsers}
        />
        <BreakdownCard
          title="Operativni sistemi"
          subtitle="Platforme koje publika koristi"
          items={report.operatingSystems}
        />
        <BreakdownCard
          title="UTM kampanje"
          subtitle="Rezultati označenih marketinških kampanja"
          items={report.campaigns}
        />
        <EventsCard items={report.events} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Poslovni rezultat
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Konverzije iz Santos sistema</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ovi brojevi dolaze iz porudžbina, kontakt forme i newsletter baze za isti period.
          </p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Kontakt upiti
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <strong className="text-2xl text-slate-950">{formatNumber(currentContacts)}</strong>
              <Delta current={currentContacts} previous={previousContacts} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Newsletter prijave
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <strong className="text-2xl text-slate-950">{formatNumber(currentNewsletter)}</strong>
              <Delta current={currentNewsletter} previous={previousNewsletter} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Konverzija
            </p>
            <strong className="mt-2 block text-2xl text-slate-950">
              {conversionRate.toLocaleString("sr-RS", { maximumFractionDigits: 2 })}%
            </strong>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Prosečna porudžbina
            </p>
            <strong className="mt-2 block text-2xl text-slate-950">{formatMoney(averageOrder)}</strong>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        <p>
          Vercel projekat: <strong className="text-slate-700">custom-suits</strong> · period se računa
          u UTC vremenu.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/orders" className="font-semibold text-blue-700 hover:underline">
            Porudžbine
          </Link>
          <Link href="/admin/contact-messages" className="font-semibold text-blue-700 hover:underline">
            Kontakt upiti
          </Link>
          <Link href="/admin/newsletter" className="font-semibold text-blue-700 hover:underline">
            Newsletter
          </Link>
        </div>
      </footer>
    </div>
  );
}

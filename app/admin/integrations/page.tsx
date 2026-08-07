"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Run = {
  id: string;
  domain: string;
  status: string;
  environment: string;
  mode: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  counters: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
  summary: string | null;
};

const statusClass = (status: string) => {
  switch (status) {
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "partial_success":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "failed":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "running":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("sr-RS");
};

/**
 * Listed in the order they are meant to be run. `manual` marks the two phases
 * an admin actually triggers by hand; the rest have their own cron in vercel.json.
 */
const ANANAS_PHASE_BUTTONS = [
  {
    id: "catalog",
    label: "Katalog",
    what: "prijavljuje nove proizvode Ananasu",
    hint: "Salje proizvode oznacene za Ananas njihovom timu na ulistavanje. Oni ih rucno objavljuju, pa ne treba slati cesce.",
    schedule: "automatski 1. u mesecu u 01:00",
    manual: true,
  },
  {
    id: "listings",
    label: "Ulistani",
    what: "povlaci sta su oni objavili",
    hint: "Vraca nam podatke o proizvodima koje je Ananas u medjuvremenu objavio. Pusti par dana posle Kataloga.",
    schedule: "automatski svaki dan u 01:30",
    manual: true,
  },
  {
    id: "prices",
    label: "Cene",
    what: "salje cene",
    hint: "Osnovne cene. Nova cena vazi od sutradan (izmedju 00:00 i 03:00 vazi odmah).",
    schedule: "automatski svaki dan u 22:30",
    manual: false,
  },
  {
    id: "stock",
    label: "Lager",
    what: "salje kolicine",
    hint: "Stanje zaliha, primenjuje se odmah. Ananas ne dozvoljava cesce od 1x na 15 minuta.",
    schedule: "automatski na 30 minuta",
    manual: false,
  },
  {
    id: "discounts",
    label: "Akcije",
    what: "salje snizenja",
    hint: "SALE akcije uz proveru trajanja, obavezne pauze izmedju akcija i limita popusta.",
    schedule: "automatski svaki dan u 02:00",
    manual: false,
  },
  {
    id: "publish",
    label: "Objava",
    what: "objavljuje / skida sa prodaje",
    hint: "Radi samo ako je ukljucena opcija ANANAS_AUTO_PUBLISH. Inace Ananas objavljuje rucno.",
    schedule: "iskljuceno po podrazumevanom podesavanju",
    manual: false,
  },
] as const;

const OTHER_SYNC_BUTTONS = [
  {
    id: "moffice",
    label: "mOffice lager",
    what: "povlaci zalihe i cene iz mOffice-a u nas katalog",
    endpoint: "/api/admin/integrations/moffice/sync",
  },
  {
    id: "legacy-stock-inbound",
    label: "Stari ZIP lager",
    what: "rezervni uvoz lagera iz ZIP fajla",
    endpoint: "/api/admin/integrations/stock/inbound/sync",
  },
  {
    id: "stock-outbound",
    label: "Izvoz lagera",
    what: "pravi izlazni fajl sa nasim stanjem zaliha",
    endpoint: "/api/admin/integrations/stock/outbound/export",
  },
  {
    id: "full-cycle",
    label: "Ceo ciklus",
    what: "pusta sve integracije redom — lager pa Ananas",
    endpoint: "/api/admin/integrations/sync",
  },
] as const;

function StepHeading({ step, title, hint }: { step: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
        {step}
      </span>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{hint}</p>
      </div>
    </div>
  );
}

/** Bumped when the guide changes materially, so the popup re-opens once for everyone. */
const TUTORIAL_SEEN_KEY = "santos.admin.ananasTutorial.v1";

/** Environment/mode survive a reload; the production confirm never does. */
const ENV_PREFS_KEY = "santos.admin.integrations.envPrefs.v1";

type TutorialSection = { title: string; lines: string[] };

const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    title: "1. Kako biram proizvode koji idu na Ananas",
    lines: [
      "Najbrze: dugme \"Oznaci sve sa web-shopa\" u Koraku 1 — oznacava tacno one proizvode koje kupac vidi na sajtu (sa slikom i lagerom).",
      "Rucno, po proizvodu: Admin > Web Shop, u editoru proizvoda ukljuci checkbox \"Posalji na Ananas\".",
      "Za vise proizvoda odjednom: selektuj ih u listi pa u bulk traci izaberi \"Posalji na Ananas\" (ili \"Ukloni sa Ananas\").",
      "To je poseban flag od obicnog Export flag-a. Export = nas sajt, Ananas = marketplace. Ukljucen Export ne salje proizvod na Ananas.",
      "Proizvodi koji su ukljuceni imaju zelenu oznaku \"Ananas\" na kartici u Web Shopu.",
      "Sync uvek uzima samo proizvode sa tim flagom — ako je lista prazna, na Ananas ne ide nista.",
    ],
  },
  {
    title: "2. Sta proizvod mora da ima da bi prosao",
    lines: [
      "Pravi EAN/GTIN barkod. Nas interni 9-cifreni mOffice kod Ananas ne moze da mapira i takav proizvod se lokalno odbija.",
      "Proizvod ne sme biti sakriven sa sajta (hiddenFromShop) — sakriveni se preskacu.",
      "Cena i lager se povlace iz mOffice-a. Proizvod bez cene ili sa lagerom 0 nema sta da trazi u ulistavanju.",
      "Sve odbijene stavke vidis u Details ekranu run-a, sa razlogom odbijanja.",
    ],
  },
  {
    title: "3. Faze i koliko cesto se pustaju",
    lines: [
      "Katalog — salje nove proizvode timu Ananasa na ulistavanje. Ulistavanje je RUCNO kod njih, zato cron ide 1x mesecno (1. u mesecu u 01:00). Max 30.000 proizvoda po zahtevu, kod sam deli u batch-eve.",
      "Ulistani — povlaci merchantInventoryId i status za proizvode koje su oni u medjuvremenu ulistali. Pusti je nekoliko dana posle Kataloga.",
      "Cene — osnovne cene, vaze od sutra (izmedju 00:00 i 03:00 vaze odmah). Cron svaki dan u 22:30.",
      "Lager — kolicine, primenjuju se odmah. Cron na 30 minuta.",
      "Akcije — SALE popusti sa validacijom trajanja i pauze. Cron svaki dan u 02:00.",
      "Publish — objavljivanje/skidanje, radi samo ako je ANANAS_AUTO_PUBLISH=true.",
    ],
  },
  {
    title: "4. Environment i mode",
    lines: [
      "Stage = njihov test sistem, sve sme da se proba. Production = pravi Ananas, kupci to vide.",
      "Za production moras da cekiras \"Confirm production sync\" — bez toga server odbija zahtev.",
      "Delta = salje samo ono sto se promenilo od poslednjeg puta. Full = salje sve, ignorise pamcenje.",
      "Prvi katalog posle reset-a pusti u Full modu, posle toga ostavi Delta.",
    ],
  },
  {
    title: "5. Reset kada Ananas obrise nase proizvode",
    lines: [
      "Ananas je 07.08.2026. obrisao nase proizvode iz svoje baze i trazi nov katalog.",
      "Mi lokalno i dalje pamtimo njihove ID-eve i hesove — zbog toga bi Katalog preskocio skoro sve, a Cene/Lager bi gadjali nepostojece proizvode.",
      "Dugme \"Reset Ananas state\" brise samo to pamcenje (listing ID-evi, hesevi, akcije). Nas katalog i podaci o proizvodima se NE diraju.",
      "Redosled: Reset > Mode: Full > Environment: Production + confirm > faza Katalog. Posle par dana pusti fazu Ulistani.",
    ],
  },
  {
    title: "6. Test pre velikog slanja",
    lines: [
      "U polje \"Test SKU filter\" upisi par mOffice SKU-ova odvojenih zarezom pa klikni \"Posalji test SKU-ove\".",
      "Salje samo te proizvode kroz fazu Katalog — dobra provera da mapiranje i EAN-ovi rade pre nego sto posaljes ceo katalog.",
      "Svaki run ima Details link sa tacnim brojem poslatih, preskocenih i odbijenih stavki.",
    ],
  },
];

function AnanasTutorialModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Uputstvo</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Ananas integracija — sta admin treba da zna</h2>
            <p className="mt-1 text-sm text-slate-600">
              Kako se biraju proizvodi za Ananas, kojim redom se pustaju faze i sta znaci koje dugme.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Zatvori uputstvo"
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-slate-300"
          >
            X
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {TUTORIAL_SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {section.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ))}
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Zlatno pravilo: sve prvo probaj na Stage. Na Production ide tek kada Stage run prodje bez gresaka.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
          <Link
            href="/admin/tutorial"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:border-slate-300"
          >
            Ceo tutorial
          </Link>
          <button
            onClick={onClose}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 hover:border-blue-300"
          >
            Razumem
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsAdminPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<"stage" | "production">("stage");
  const [mode, setMode] = useState<"delta" | "full">("delta");
  const [confirmProduction, setConfirmProduction] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [ananasSkuFilter, setAnanasSkuFilter] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);
  const [unflagOthers, setUnflagOthers] = useState(true);

  // Auto-open once per browser; the button below reopens it any time.
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(TUTORIAL_SEEN_KEY)) setShowTutorial(true);
    } catch {
      // private mode / storage blocked — skip the auto-open, button still works
    }
  }, []);

  // Environment and mode used to reset to Stage/Delta on every reload, which
  // silently sent a production run to the test system. The production confirm is
  // deliberately NOT restored — it stays a per-session decision.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ENV_PREFS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { environment?: string; mode?: string };
      if (parsed.environment === "production" || parsed.environment === "stage") {
        setEnvironment(parsed.environment);
      }
      if (parsed.mode === "delta" || parsed.mode === "full") setMode(parsed.mode);
    } catch {
      // ignore unreadable prefs
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ENV_PREFS_KEY, JSON.stringify({ environment, mode }));
    } catch {
      // ignore
    }
  }, [environment, mode]);

  const closeTutorial = () => {
    setShowTutorial(false);
    try {
      window.localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    } catch {
      // ignore
    }
  };

  const runSelection = async (apply: boolean, unflagOthers: boolean) => {
    if (apply) {
      const confirmed = window.confirm(
        unflagOthers
          ? "Oznacice sve proizvode koji su trenutno na web-shop strani i SKINUTI oznaku sa onih koji vise nisu.\n\nNastaviti?"
          : "Oznacice sve proizvode koji su trenutno na web-shop strani za slanje na Ananas.\n\nNastaviti?",
      );
      if (!confirmed) return;
    }
    setRunningAction(apply ? "selection-apply" : "selection-preview");
    setError(null);
    setSelectionNotice(null);
    try {
      const res = await fetch("/api/admin/integrations/ananas/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(apply ? { confirmSelection: "CONFIRM_ANANAS_SELECTION" } : {}),
          unflagOthers,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Selekcija nije uspela.");
      } else {
        const d = json.data || {};
        setSelectionNotice(
          d.applied
            ? `Gotovo: ${d.visibleModels} modela na sajtu = ${d.variants} artikala za Ananas. Novo oznaceno: ${d.flagged}. Skinuta oznaka: ${d.unflagged}.`
            : `Provera: ${d.visibleModels} modela na sajtu = ${d.variants} artikala. Vec oznaceno: ${d.alreadyFlagged}. Bilo bi dodato: ${d.toFlag}. Bilo bi skinuto: ${d.toUnflag}.`,
        );
      }
    } catch (err: any) {
      setError(err?.message || "Selekcija nije uspela.");
    } finally {
      setRunningAction(null);
    }
  };

  const resetAnanasState = async () => {
    const confirmed = window.confirm(
      "Brise nase pamcenje Ananas ulistavanja (listing ID-evi, hesevi, akcije).\n" +
        "Nas katalog se ne dira. Radi ovo samo kada Ananas obrise proizvode kod sebe.\n\nNastaviti?",
    );
    if (!confirmed) return;
    setRunningAction("ananas-reset");
    setError(null);
    setResetNotice(null);
    try {
      const res = await fetch("/api/admin/integrations/ananas/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmReset: "CONFIRM_ANANAS_RESET" }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Reset nije uspeo.");
      } else {
        const data = json.data || {};
        setResetNotice(
          `Reset gotov: ${data.productStates || 0} listing zapisa, ${data.deltaStates || 0} delta hesova, ${data.discountStates || 0} akcija obrisano. ` +
            "Sledeci Katalog pusti u Full modu.",
        );
      }
    } catch (err: any) {
      setError(err?.message || "Reset nije uspeo.");
    } finally {
      setRunningAction(null);
    }
  };

  const loadRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/integrations/runs?limit=100");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Neuspesno ucitavanje run istorije.");
      } else {
        setRuns(json.data || []);
      }
    } catch (err: any) {
      setError(err?.message || "Greska pri ucitavanju.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const runSync = async (endpoint: string, label: string, phases?: string[], skus?: string[]) => {
    // The server rejects this too, but failing here keeps the run out of the
    // history and names the reason instead of showing a bare error.
    if (environment === "production" && !confirmProduction) {
      setError(
        "Izabrano je Production, a potvrda nije cekirana. Cekiraj \"Potvrda za Production\" u Koraku 2.",
      );
      return;
    }
    setRunningAction(label);
    setError(null);
    try {
      const body: Record<string, unknown> = { environment, mode };
      if (phases?.length) body.phases = phases;
      if (skus?.length) body.skus = skus;
      if (environment === "production" && confirmProduction) {
        body.confirmProduction = "CONFIRM_PRODUCTION_SYNC";
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Sync akcija nije uspela.");
      } else {
        await loadRuns();
      }
    } catch (err: any) {
      setError(err?.message || "Sync akcija nije uspela.");
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {showTutorial ? <AnanasTutorialModal onClose={closeTutorial} /> : null}

      {/* Sticky, because the phase buttons sit far below the environment select —
          a run that silently went to Stage cost us a confused round trip. */}
      <div
        className={`sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2 text-sm shadow-sm ${
          environment === "production"
            ? confirmProduction
              ? "border-rose-300 bg-rose-50 text-rose-800"
              : "border-amber-300 bg-amber-50 text-amber-900"
            : "border-slate-300 bg-slate-100 text-slate-700"
        }`}
      >
        <span className="font-semibold">
          {environment === "production" ? "Svako dugme salje na PRAVI Ananas (uzivo)" : "Svako dugme salje na PROBNI sistem (stage)"}
          {" — obim: "}
          {mode === "full" ? "Full" : "Delta"}
        </span>
        {environment === "production" && !confirmProduction ? (
          <span className="font-semibold">Potvrda nije cekirana — slanje ce biti odbijeno</span>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Integracije</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Ananas i lager</h1>
            <p className="mt-1 text-sm text-slate-600">
              Idi redom kroz korake 1 do 4. Ako nesto nije jasno, otvori Uputstvo.
            </p>
          </div>
          <button
            onClick={() => setShowTutorial(true)}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 hover:border-blue-300"
          >
            Uputstvo
          </button>
        </div>
      </div>

      {/* KORAK 1 — pick the products, straight from what the storefront shows. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <StepHeading
          step={1}
          title="Izaberi proizvode"
          hint="Na Ananas ide samo ono sto je oznaceno. Najlakse: preuzmi izbor sa web-shop strane."
        />

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Preuzmi sa web-shopa{" "}
            <span className="font-normal text-slate-500">
              (oznacava sve proizvode koje kupac trenutno vidi na sajtu — sa slikom i lagerom)
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Koristi identican filter kao sama web-shop strana. Svaka velicina jednog modela ide kao poseban
            artikal na Ananas, jer ih oni tako ulistavaju.
          </p>

          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={unflagOthers}
              onChange={(event) => setUnflagOthers(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              Skini oznaku sa proizvoda kojih vise nema na sajtu{" "}
              <span className="text-slate-500">
                (preporuceno — drzi izbor identican sajtu; iskljuci ako si nesto rucno dodao van sajta)
              </span>
            </span>
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => runSelection(false, unflagOthers)}
              disabled={Boolean(runningAction)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
            >
              {runningAction === "selection-preview" ? "Racuna se..." : "Prvo proveri (nista ne menja)"}
            </button>
            <button
              onClick={() => runSelection(true, unflagOthers)}
              disabled={Boolean(runningAction)}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:border-emerald-400 disabled:opacity-50"
            >
              {runningAction === "selection-apply" ? "Oznacava se..." : "Oznaci sve sa web-shopa"}
            </button>
          </div>
          {selectionNotice ? <p className="mt-2 text-sm text-emerald-700">{selectionNotice}</p> : null}
          <p className="mt-2 text-xs text-slate-500">
            Pojedinacno dodavanje/skidanje radis kvacicom &quot;Posalji na Ananas&quot; u Web Shopu.
          </p>
        </div>
      </section>

      {/* KORAK 2 — where the run is sent and how much of it goes out. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <StepHeading
          step={2}
          title="Podesi gde i koliko saljes"
          hint="Ovo vazi za svako dugme ispod — proveri pre svakog slanja."
        />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Okruzenje{" "}
              <span className="font-normal text-slate-500">(gde se salje: probni ili pravi Ananas)</span>
            </span>
            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as "stage" | "production")}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="stage">Stage — probni sistem, kupci ne vide</option>
              <option value="production">Production — pravi Ananas, uzivo</option>
            </select>
            <span className="text-xs text-slate-500">
              {environment === "production"
                ? "Uzivo. Sve sto posaljes vide kupci na Ananasu."
                : "Bezbedno za testiranje. Sve prvo probaj ovde."}
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-900">
              Obim{" "}
              <span className="font-normal text-slate-500">(salje se samo izmenjeno ili bas sve)</span>
            </span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as "delta" | "full")}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="delta">Delta — samo ono sto se promenilo</option>
              <option value="full">Full — kompletan katalog ispocetka</option>
            </select>
            <span className="text-xs text-slate-500">
              {mode === "full"
                ? "Salje sve, ignorise sta je vec poslato. Koristi se posle reset-a."
                : "Za svakodnevni rad. Preskace proizvode koji se nisu menjali."}
            </span>
          </label>
        </div>

        <label
          className={`mt-4 flex items-start gap-3 rounded-xl border p-3 ${
            environment === "production"
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 bg-slate-50 opacity-60"
          }`}
        >
          <input
            type="checkbox"
            checked={confirmProduction}
            onChange={(event) => setConfirmProduction(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm">
            <span className="font-semibold text-slate-900">
              Potvrda za Production{" "}
              <span className="font-normal text-slate-500">(sigurnosna brava, obavezna za slanje uzivo)</span>
            </span>
            <span className="mt-0.5 block text-xs text-slate-600">
              {environment === "production"
                ? "Bez ove kvacice server odbija svako slanje na pravi Ananas."
                : "Nije potrebna dok si na Stage okruzenju."}
            </span>
          </span>
        </label>

        {environment === "production" && !confirmProduction ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Izabrano je Production, a potvrda nije cekirana — slanje ce biti odbijeno.
          </p>
        ) : null}
      </section>

      {/* KORAK 3 — pilot run on a handful of SKUs before the full catalog. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <StepHeading
          step={3}
          title="Probaj na par proizvoda"
          hint="Uvek uradi ovo pre nego sto posaljes ceo katalog."
        />

        <div className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-900">
            Sifre proizvoda{" "}
            <span className="font-normal text-slate-500">(mOffice SKU, vise njih odvoji zarezom)</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={ananasSkuFilter}
              onChange={(event) => setAnanasSkuFilter(event.target.value)}
              placeholder="npr. 133342, 133856"
              className="w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
            <button
              onClick={() =>
                runSync(
                  "/api/admin/integrations/ananas/sync",
                  "ananas-catalog-filtered",
                  ["catalog"],
                  ananasSkuFilter.split(",").map((s) => s.trim()).filter(Boolean),
                )
              }
              disabled={Boolean(runningAction) || !ananasSkuFilter.trim()}
              title="Salje samo navedene SKU-ove kroz fazu Katalog."
              className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:border-emerald-400 disabled:opacity-50"
            >
              {runningAction === "ananas-catalog-filtered" ? "Salje se..." : "Posalji probno"}
            </button>
          </div>
          <span className="text-xs text-slate-500">
            Salje samo te proizvode kroz fazu Katalog. Rezultat proveri klikom na Details u tabeli ispod.
          </span>
        </div>
      </section>

      {/* KORAK 4 — the phases, in the order they are meant to be run. Ananas caps
          how often each may run (catalog is monthly, stock >=15 min apart), so
          every phase stays individually runnable. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <StepHeading
          step={4}
          title="Pusti faze — ovim redom"
          hint="Faze 1 i 2 pokreces rucno. Faze 3, 4 i 5 idu same po rasporedu."
        />

        <ol className="mt-4 flex flex-col gap-3">
          {ANANAS_PHASE_BUTTONS.map((phase, index) => (
            <li
              key={phase.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                phase.manual ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    phase.manual ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {phase.label} <span className="font-normal text-slate-500">({phase.what})</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">{phase.hint}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {phase.manual ? "Pokreces rucno" : "Automatski"} — {phase.schedule}
                  </p>
                </div>
              </div>
              <button
                onClick={() => runSync("/api/admin/integrations/ananas/sync", `ananas-${phase.id}`, [phase.id])}
                disabled={Boolean(runningAction)}
                title={phase.hint}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                  phase.manual
                    ? "border-blue-300 bg-blue-50 text-blue-800 hover:border-blue-400"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {runningAction === `ananas-${phase.id}` ? "Salje se..." : "Pusti"}
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => runSync("/api/admin/integrations/ananas/sync", "ananas")}
            disabled={Boolean(runningAction)}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
          >
            {runningAction === "ananas" ? "Salje se..." : "Pusti sve faze odjednom"}
          </button>
          <span className="text-xs text-slate-500">
            (pusta ceo Ananas ciklus redom — koristi kad ne zelis fazu po fazu)
          </span>
        </div>
      </section>

      {/* Destructive: only after Ananas confirms they deleted our products. */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">Opasna zona</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Reset Ananas stanja{" "}
          <span className="text-sm font-normal text-slate-600">(samo kada Ananas obrise nase proizvode kod sebe)</span>
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          Brise nase pamcenje o njihovom ulistavanju — ID-eve, hesove i akcije. Nas katalog i podaci o
          proizvodima se NE diraju. Posle reset-a: Obim = Full, pa faza Katalog.
        </p>
        <div className="mt-3">
          <button
            onClick={resetAnanasState}
            disabled={Boolean(runningAction)}
            className="rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400 disabled:opacity-50"
          >
            {runningAction === "ananas-reset" ? "Radi se..." : "Resetuj Ananas stanje"}
          </button>
        </div>
        {resetNotice ? <p className="mt-2 text-sm text-emerald-700">{resetNotice}</p> : null}
      </section>

      {/* Everything that is not Ananas — kept out of the stepped flow above. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ostale sinhronizacije</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">Lager i izvoz (nije Ananas)</h2>
        <div className="mt-3 flex flex-col gap-2">
          {OTHER_SYNC_BUTTONS.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-slate-800">
                <span className="font-semibold">{entry.label}</span>{" "}
                <span className="text-slate-500">({entry.what})</span>
              </p>
              <button
                onClick={() => runSync(entry.endpoint, entry.id)}
                disabled={Boolean(runningAction)}
                className="shrink-0 rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
              >
                {runningAction === entry.id ? "Radi se..." : "Pusti"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Ucitavanje run istorije...</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Istorija sinhronizacija</h2>
            <p className="text-sm text-slate-600">
              Svako pustanje ostaje zapisano. Klikni Detalji za tacan spisak poslatog i odbijenog.
            </p>
          </div>
          <button
            onClick={loadRuns}
            disabled={loading}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300 disabled:opacity-50"
          >
            {loading ? "Ucitava..." : "Osvezi"}
          </button>
        </div>
        <table className="min-w-full text-sm text-slate-700">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <th className="px-2 py-2">Sifra</th>
              <th className="px-2 py-2">Sta je pusteno</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Okruzenje</th>
              <th className="px-2 py-2">Obim</th>
              <th className="px-2 py-2" title="Ukupno / Uspesno / Greske / Preskoceno">
                U / S / G / P
              </th>
              <th className="px-2 py-2">Pocetak</th>
              <th className="px-2 py-2">Trajanje</th>
              <th className="px-2 py-2">Detalji</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-slate-100">
                <td className="px-2 py-2 font-mono text-[11px]">{run.id.slice(0, 8)}</td>
                <td className="px-2 py-2">{run.domain}</td>
                <td className="px-2 py-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass(run.status)}`}>
                    {run.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-2 py-2">{run.environment}</td>
                <td className="px-2 py-2">{run.mode}</td>
                <td className="px-2 py-2 text-xs" title="Ukupno / Uspesno / Greske / Preskoceno">
                  {run.counters.total} / <span className="text-emerald-700">{run.counters.success}</span> /{" "}
                  <span className={run.counters.failed ? "font-semibold text-rose-700" : ""}>{run.counters.failed}</span> /{" "}
                  {run.counters.skipped}
                </td>
                <td className="px-2 py-2 text-xs">{formatDateTime(run.startedAt)}</td>
                <td className="px-2 py-2 text-xs">
                  {run.durationMs == null ? "-" : `${Math.round(run.durationMs / 1000)}s`}
                </td>
                <td className="px-2 py-2">
                  <Link href={`/admin/integrations/${run.id}`} className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                    Detalji
                  </Link>
                </td>
              </tr>
            ))}
            {!runs.length && !loading ? (
              <tr>
                <td colSpan={9} className="px-2 py-4 text-center text-sm text-slate-500">
                  Nema sync run podataka.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

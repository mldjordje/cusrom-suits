import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ADMIN_LEGACY_TOKEN_COOKIE,
  ADMIN_SESSION_COOKIE,
  isValidLegacyAdminToken,
  getAdminViewerFromCookieStore,
  sanitizeAdminNextPath,
} from "@/lib/adminAuth";
import { isGoogleAdminSignInConfigured } from "@/lib/adminGoogleOAuth";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Admin Login | Santos & Santorini",
  description: "Prijava za pristup Santos administraciji.",
  path: "/admin-login",
  noIndex: true,
});

type SearchParams = Record<string, string | string[] | undefined>;

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeAdminNextPath(getParam(params.next));
  const showError = getParam(params.error) === "1";
  const googleError = getParam(params.error);
  const googleSignInEnabled = isGoogleAdminSignInConfigured();
  const cookieStore = await cookies();
  const hasSession =
    Boolean(await getAdminViewerFromCookieStore(cookieStore)) ||
    isValidLegacyAdminToken(cookieStore.get(ADMIN_LEGACY_TOKEN_COOKIE)?.value);

  if (hasSession) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_48%,#020617_100%)] px-4 py-10 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur xl:grid-cols-[1.1fr,0.9fr]">
          <section className="hidden border-r border-white/10 bg-[linear-gradient(160deg,rgba(15,23,42,0.92),rgba(30,41,59,0.78))] p-10 xl:block">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-300">Santos Admin</p>
            <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight text-white">
              Jednostavan pristup za katalog, porudzbine i integracije.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">
              Santos admin sada podrzava vise korisnika i role, tako da svaki clan tima moze da dobije svoj pristup.
            </p>
            <div className="mt-10 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Sta pokriva</p>
                <p className="mt-2 text-sm text-slate-300">Admin dashboard, porudzbine, webshop kontrole i integracije vise nisu otvoreni bez prijave.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Role i privilegije</p>
                <p className="mt-2 text-sm text-slate-300">Owner nalog moze da otvara dodatne admine, dodeljuje role i ogranicava pristup po funkcijama.</p>
              </div>
            </div>
          </section>

          <section className="bg-white px-6 py-8 text-slate-900 sm:px-10 sm:py-12">
            <div className="mx-auto flex max-w-md flex-col">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Prijava</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Admin pristup</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Uloguj se da bi usao u Santos admin panel. Posle prijave vracamo te tamo gde si krenuo.
              </p>

              <form action="/api/admin/login" method="post" className="mt-8 space-y-4">
                <input type="hidden" name="next" value={nextPath} />

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Korisnicko ime</span>
                  <input
                    type="text"
                    name="username"
                    defaultValue=""
                    autoComplete="username"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Lozinka</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </label>

                {showError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    Pogresno korisnicko ime ili lozinka.
                  </div>
                ) : null}

                {googleError && googleError !== "1" ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {googleError === "google_forbidden"
                      ? "Ovaj Google nalog nema admin pristup."
                      : googleError === "google_config"
                        ? "Google prijava nije podesena na serveru."
                        : googleError === "google_state"
                          ? "Sesija prijave je istekla ili domen nije isti (npr. www vs bez www). Otvori admin prijavu na istom URL-u kao u Google konzoli i pokusaj ponovo."
                          : googleError === "google_token"
                            ? "Google nije prihvatio kod prijave (redirect URI na serveru i u Google Cloud moraju biti identicni)."
                            : "Google prijava nije uspela. Pokusaj ponovo."}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Uloguj se
                </button>
              </form>

              {googleSignInEnabled ? (
                <div className="mt-6">
                  <a
                    href={`/api/admin/auth/google?next=${encodeURIComponent(nextPath)}`}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                      <path
                        fill="#FFC107"
                        d="M43.611 20.083H42V20H24v8h11.303C33.72 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                      />
                      <path
                        fill="#FF3D00"
                        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                      />
                      <path
                        fill="#4CAF50"
                        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                      />
                      <path
                        fill="#1976D2"
                        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                      />
                    </svg>
                    Nastavi sa Google nalogom
                  </a>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Samo odobreni admin mejlovi mogu da udju.
                  </p>
                </div>
              ) : null}

              <p className="mt-6 text-xs leading-5 text-slate-500">
                Ako i dalje koristis stari token pristup, on ostaje podrzan preko `?token=` linka.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

import { cookies } from "next/headers";
import { getAdminViewerFromCookieStore, hasAdminPermission } from "@/lib/adminAuth";
import { listAdminUsers } from "@/lib/adminUsers";
import { getAdminRoleDefinitions } from "@/lib/adminRoles";

type SearchParams = Record<string, string | string[] | undefined>;

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await getAdminViewerFromCookieStore(await cookies());
  const canManageUsers = hasAdminPermission(viewer, "admin.users.manage");

  if (!canManageUsers) {
    return (
      <section className="rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Users & Roles</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">Pristup je ogranicen</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Samo owner nalog trenutno moze da upravlja admin korisnicima i privilegijama.
        </p>
      </section>
    );
  }

  const params = await searchParams;
  const roles = getAdminRoleDefinitions();
  const users = await listAdminUsers();
  const status = getParam(params.status);
  const error = getParam(params.error);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Users & Roles</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">Admin korisnici i privilegije</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Ovde dodeljujes pristup timu bez deljenja jednog zajednickog naloga. Role odmah definisu koje delove
          administracije korisnik treba da vidi i koristi.
        </p>

        {status ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Sacuvano: {status}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {roles.map((role) => (
          <article key={role.id} className="rounded-[24px] border border-black/5 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{role.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{role.description}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Dozvole</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {role.permissions.map((permission) => (
                <span key={permission} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                  {permission}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Novi korisnik</p>
        <form action="/api/admin/users" method="post" className="mt-5 grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="action" value="create" />

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Ime i prezime / prikaz</span>
            <input
              type="text"
              name="displayName"
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Korisnicko ime</span>
            <input
              type="text"
              name="username"
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">Lozinka</span>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </label>

          <div className="lg:col-span-2">
            <p className="mb-3 text-sm font-medium text-slate-700">Role</p>
            <div className="grid gap-3 md:grid-cols-2">
              {roles.map((role) => (
                <label key={role.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" name="roleIds" value={role.id} className="mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900">{role.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{role.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-700 lg:col-span-2">
            <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
            Aktivan nalog
          </label>

          <div className="lg:col-span-2">
            <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Dodaj admin korisnika
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        {users.map((user) => (
          <article key={user.id} className="rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-950">{user.displayName}</p>
                <p className="text-sm text-slate-500">@{user.username}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                  {user.isActive ? "Aktivan" : "Neaktivan"}
                </span>
                {user.roleIds.map((roleId) => (
                  <span key={roleId} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                    {roleId}
                  </span>
                ))}
              </div>
            </div>

            <form action="/api/admin/users" method="post" className="mt-5 grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="action" value="update" />
              <input type="hidden" name="id" value={user.id} />

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Ime za prikaz</span>
                <input
                  type="text"
                  name="displayName"
                  defaultValue={user.displayName}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Korisnicko ime</span>
                <input
                  type="text"
                  name="username"
                  defaultValue={user.username}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">Nova lozinka</span>
                <input
                  type="password"
                  name="password"
                  placeholder="Ostavi prazno ako se lozinka ne menja"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>

              <div className="lg:col-span-2">
                <p className="mb-3 text-sm font-medium text-slate-700">Role</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {roles.map((role) => (
                    <label key={`${user.id}-${role.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name="roleIds"
                          value={role.id}
                          defaultChecked={user.roleIds.includes(role.id)}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{role.label}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{role.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-700 lg:col-span-2">
                <input type="checkbox" name="isActive" defaultChecked={user.isActive} className="h-4 w-4" />
                Aktivan nalog
              </label>

              <div className="flex flex-wrap gap-3 lg:col-span-2">
                <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Sacuvaj izmene
                </button>
              </div>
            </form>

            <form action="/api/admin/users" method="post" className="mt-3">
              <input type="hidden" name="action" value="delete" />
              <input type="hidden" name="id" value={user.id} />
              <button
                type="submit"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Obrisi korisnika
              </button>
            </form>

            <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
              <p>Kreiran: {new Date(user.createdAt).toLocaleString("sr-RS")}</p>
              <p>Izmenjen: {new Date(user.updatedAt).toLocaleString("sr-RS")}</p>
              <p>Poslednji login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("sr-RS") : "Jos nije bilo prijave"}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

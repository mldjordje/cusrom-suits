"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * The category tree as customers browse it, with a product drill-down.
 *
 * The rest of this screen edits the registry — categories someone typed in. But
 * the shop navigates by derived groups, so "which categories exist" and "what
 * is in them" could not be answered from the admin at all. This panel answers
 * both against the same query the storefront runs.
 */

type SubGroup = { key: string; name: string; count: number };

type RegistryChild = {
  id: number;
  name: string;
  path: string[];
  isVisible: boolean;
  /** Resolved menu opt-in: whether the shop dropdown lists this category. */
  showInMenu: boolean;
  isLive: boolean;
  /** Products carrying this category, and how many of those a customer can buy. */
  assigned: number;
  sellable: number;
};

type LiveGroup = {
  key: string;
  name: string;
  count: number;
  subGroups: SubGroup[];
  registryChildren: RegistryChild[];
};

/** Green = customers see it. Grey = it exists but is switched off. */
const StatusDot = ({ on }: { on: boolean }) => (
  <span className={`h-2 w-2 shrink-0 rounded-full ${on ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden />
);

type ProductRow = {
  legacyId: number;
  sku: string;
  name: string;
  coverImage?: string | null;
  stockTotal?: number;
  isActive?: boolean;
  isExported?: boolean;
};

/** Which node the product list is showing: an auto-group or a registry category. */
type Target =
  | { kind: "group"; key: string; label: string }
  | { kind: "category"; id: number; label: string };

const targetId = (target: Target) => (target.kind === "group" ? `g:${target.key}` : `c:${target.id}`);

/** Main categories a loose one can be filed under. Mirrors ALL_AUTO_GROUPS. */
const PARENT_CHOICES: Array<{ key: string; name: string }> = [
  { key: "odelo", name: "Odela" },
  { key: "sako", name: "Sakoi" },
  { key: "pantalone", name: "Pantalone" },
  { key: "kosulja", name: "Košulje" },
  { key: "dzemper", name: "Džemperi" },
  { key: "prsluk", name: "Prsluci" },
  { key: "kaput", name: "Kaputi" },
  { key: "jakna", name: "Jakne" },
  { key: "obuca", name: "Obuća" },
  { key: "aksesoari", name: "Aksesoari" },
];

export default function LiveCategoryTree({
  onChanged,
  onCreateSubcategory,
}: {
  onChanged: () => void;
  onCreateSubcategory: (groupKey: string, groupName: string) => void;
}) {
  const [groups, setGroups] = useState<LiveGroup[]>([]);
  const [orphans, setOrphans] = useState<RegistryChild[]>([]);
  const [totals, setTotals] = useState<{ liveProducts: number; allProducts: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Which group has its "attach an existing category" picker open. */
  const [attachGroup, setAttachGroup] = useState<string | null>(null);

  /** The full category list, folded away until asked for. */
  const [showAll, setShowAll] = useState(false);
  const [allFilter, setAllFilter] = useState("");
  /* A category filed under a group is clickable in two places. Without this the
     product panel would open in both at once. */
  const [openedFromAll, setOpenedFromAll] = useState(false);

  const [openTarget, setOpenTarget] = useState<Target | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productsLoading, setProductsLoading] = useState(false);

  const [skuInput, setSkuInput] = useState("");
  const [skuBusy, setSkuBusy] = useState(false);
  const [skuNotice, setSkuNotice] = useState<string | null>(null);

  /** Auto-groups the shop is allowed to show. Empty until the first load. */
  const [enabledGroups, setEnabledGroups] = useState<Set<string>>(new Set());
  /** Auto sub-groups the admin unhooked from their parent, and the full list. */
  const [detachedSubGroups, setDetachedSubGroups] = useState<Set<string>>(new Set());
  const [allSubGroups, setAllSubGroups] = useState<Array<{ key: string; name: string; parentKey: string }>>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [treeRes, groupsRes] = await Promise.all([
        fetch("/api/admin/webshop/categories/overview"),
        fetch("/api/admin/webshop/categories/auto-groups"),
      ]);
      const json = await treeRes.json();
      if (!json?.success) {
        setError(json?.message || "Ucitavanje kategorija nije uspelo.");
        return;
      }
      setGroups(json.groups || []);
      setOrphans(json.orphanRegistry || []);
      setTotals(json.totals || null);

      const groupsJson = await groupsRes.json();
      if (groupsJson?.success && Array.isArray(groupsJson.enabledGroups)) {
        setEnabledGroups(new Set(groupsJson.enabledGroups.map(String)));
      }
      if (groupsJson?.success) {
        setDetachedSubGroups(new Set((groupsJson.detachedSubGroups || []).map(String)));
        setAllSubGroups(Array.isArray(groupsJson.allSubGroups) ? groupsJson.allSubGroups : []);
      }
    } catch {
      setError("Ucitavanje kategorija nije uspelo.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Main categories are switched on and off as a set, so the toggle sends the
     whole enabled list back rather than a single key. */
  const toggleGroupEnabled = async (groupKey: string, nextOn: boolean) => {
    const previous = enabledGroups;
    const next = new Set(enabledGroups);
    if (nextOn) next.add(groupKey);
    else next.delete(groupKey);
    setEnabledGroups(next);
    setBusyKey(groupKey);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/categories/auto-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledGroups: [...next] }),
      });
      const json = await res.json().catch(() => null);
      /* The response used to be ignored, so a rejected write still left the
         switch looking flipped until the next reload. Put it back instead. */
      if (!res.ok || !json?.success) {
        setEnabledGroups(previous);
        setError(json?.message || "Promena vidljivosti kategorije nije uspela.");
        return;
      }
      onChanged();
    } catch {
      setEnabledGroups(previous);
      setError("Promena vidljivosti kategorije nije uspela.");
    } finally {
      setBusyKey(null);
    }
  };

  /* Automatic sub-groups are derived from product names, so they cannot be
     deleted — but they can stop belonging to their parent. Detaching Kaisevi
     takes belts out of Aksesoari in the menu AND out of its product list. */
  const toggleSubGroupDetached = async (subKey: string, nextDetached: boolean) => {
    const previous = detachedSubGroups;
    const next = new Set(detachedSubGroups);
    if (nextDetached) next.add(subKey);
    else next.delete(subKey);
    setDetachedSubGroups(next);
    setBusyKey(`s${subKey}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/categories/auto-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledGroups: [...enabledGroups], detachedSubGroups: [...next] }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setDetachedSubGroups(previous);
        setError(json?.message || "Promena podkategorije nije uspela.");
        return;
      }
      await loadTree();
      onChanged();
    } catch {
      setDetachedSubGroups(previous);
      setError("Promena podkategorije nije uspela.");
    } finally {
      setBusyKey(null);
    }
  };

  /* The menu no longer decides for itself which categories are worth listing —
     stock and images stopped being a condition. This switch is the whole rule,
     for a category filed under a main one and for a loose one alike (loose ones
     land in the top level of the dropdown, next to Odela and Sakoi). */
  const toggleChildInMenu = async (child: RegistryChild, nextOn: boolean) => {
    setBusyKey(`c${child.id}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: child.id, showInMenu: nextOn }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.message || "Promena menija nije uspela.");
        return;
      }
      await loadTree();
      onChanged();
    } catch {
      setError("Promena menija nije uspela.");
    } finally {
      setBusyKey(null);
    }
  };

  const toggleChildVisible = async (child: RegistryChild, nextOn: boolean) => {
    setBusyKey(`c${child.id}`);
    try {
      const res = await fetch("/api/admin/webshop/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: child.id, isVisible: nextOn }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Promena vidljivosti nije uspela.");
        return;
      }
      await loadTree();
      onChanged();
    } catch {
      setError("Promena vidljivosti nije uspela.");
    } finally {
      setBusyKey(null);
    }
  };

  /** File a loose category under a main one — it then shows in that menu. */
  const setChildParent = async (child: RegistryChild, parentGroup: string) => {
    setBusyKey(`c${child.id}`);
    try {
      const res = await fetch("/api/admin/webshop/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: child.id, parentGroup }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Premestanje kategorije nije uspelo.");
        return;
      }
      await loadTree();
      onChanged();
    } catch {
      setError("Premestanje kategorije nije uspelo.");
    } finally {
      setBusyKey(null);
    }
  };

  /* Renaming lives here too, not only inside the registry editor's expanded
     form — this panel is where categories are actually managed, and a category
     typed in a hurry ("Majce") had no visible way back to a correct name. The
     PATCH propagates the new name onto every product that carries it. */
  const renameChild = async (child: RegistryChild) => {
    if (typeof window === "undefined") return;
    const nextName = window.prompt(`Novi naziv kategorije "${child.name}":`, child.name);
    if (nextName === null) return;
    const clean = nextName.trim();
    if (!clean || clean === child.name) return;

    setBusyKey(`c${child.id}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: child.id, name: clean }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.message || "Preimenovanje nije uspelo.");
        return;
      }
      if (openTarget?.kind === "category" && openTarget.id === child.id) {
        setOpenTarget({ kind: "category", id: child.id, label: clean });
      }
      await loadTree();
      onChanged();
    } catch {
      setError("Preimenovanje nije uspelo.");
    } finally {
      setBusyKey(null);
    }
  };

  /** Take a subcategory out of its main category. It stays in the system, it
      just drops to the loose list — the opposite of "stavi pod...". */
  const detachChild = (child: RegistryChild) => setChildParent(child, "");

  /** Fold one category into another. Products move over; the source is gone. */
  const mergeInto = async (source: RegistryChild, targetId: number) => {
    const target = allCategories.find((row) => row.child.id === targetId)?.child;
    if (!target) return;
    const message =
      `Spojiti "${source.name}" u "${target.name}"?

` +
      `${source.assigned} artikala prelazi u "${target.name}", a "${source.name}" nestaje. ` +
      `Artikli ne gube kategoriju — samo dobijaju drugo ime.`;
    if (typeof window !== "undefined" && !window.confirm(message)) return;

    setBusyKey(`c${source.id}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/categories/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id, targetId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.message || "Spajanje nije uspelo.");
        return;
      }
      await loadTree();
      onChanged();
    } catch {
      setError("Spajanje nije uspelo.");
    } finally {
      setBusyKey(null);
    }
  };

  const deleteChild = async (child: RegistryChild) => {
    /* Deleting a category that products still point at would leave them tagged
       with something that no longer exists, so say what will happen and only
       force when the admin confirms it. */
    const message =
      child.assigned > 0
        ? `Obrisati podkategoriju "${child.name}"?\n\nDodeljena je na ${child.assigned} artikala — biće uklonjena sa njih. Artikli ostaju u shopu, samo gube ovu kategoriju.`
        : `Obrisati podkategoriju "${child.name}"?`;
    if (typeof window !== "undefined" && !window.confirm(message)) return;

    setBusyKey(`c${child.id}`);
    try {
      const res = await fetch(
        `/api/admin/webshop/categories?id=${child.id}${child.assigned > 0 ? "&force=1" : ""}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Brisanje nije uspelo.");
        return;
      }
      if (openTarget?.kind === "category" && openTarget.id === child.id) setOpenTarget(null);
      await loadTree();
      onChanged();
    } catch {
      setError("Brisanje nije uspelo.");
    } finally {
      setBusyKey(null);
    }
  };

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  /* Every registry category in one list, with the main category it currently
     sits under. The picker on a group row needs to offer categories that
     already exist somewhere else — that is the whole point of it. */
  const allCategories = useMemo(() => {
    const rows: Array<{ child: RegistryChild; parentKey: string; parentName: string }> = [];
    for (const group of groups) {
      for (const child of group.registryChildren) {
        rows.push({ child, parentKey: group.key, parentName: group.name });
      }
    }
    for (const orphan of orphans) rows.push({ child: orphan, parentKey: "", parentName: "" });
    return rows.sort((a, b) => a.child.name.localeCompare(b.child.name, "sr"));
  }, [groups, orphans]);

  const loadProducts = useCallback(async (target: Target) => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "60", sort: "name_asc" });
      if (target.kind === "group") params.set("categoryGroup", target.key);
      else params.set("categoryId", String(target.id));
      const res = await fetch(`/api/admin/webshop/products?${params.toString()}`);
      const json = await res.json();
      if (!json?.success) {
        setProducts([]);
        setProductTotal(0);
        return;
      }
      setProducts((json.data || []) as ProductRow[]);
      setProductTotal(json.pagination?.total || 0);
    } catch {
      setProducts([]);
      setProductTotal(0);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const toggleTarget = (target: Target) => {
    setOpenedFromAll(false);
    setSkuNotice(null);
    setSkuInput("");
    if (openTarget && targetId(openTarget) === targetId(target)) {
      setOpenTarget(null);
      setProducts([]);
      return;
    }
    setOpenTarget(target);
    void loadProducts(target);
  };

  const applySku = async (action: "add" | "remove", sku: string) => {
    if (!openTarget) return;
    const cleanSku = sku.trim();
    if (!cleanSku) {
      setSkuNotice("Unesi SKU.");
      return;
    }
    setSkuBusy(true);
    setSkuNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/categories/assign-sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: cleanSku,
          action,
          ...(openTarget.kind === "group" ? { groupKey: openTarget.key } : { categoryId: openTarget.id }),
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setSkuNotice(json?.message || "Akcija nije uspela.");
        return;
      }
      setSkuNotice(
        action === "add"
          ? `Dodato: ${json.productName} (${json.updated} varijanti) u ${openTarget.label}.`
          : `Uklonjeno: ${json.productName} (${json.updated} varijanti) iz ${openTarget.label}.`,
      );
      setSkuInput("");
      await loadProducts(openTarget);
      await loadTree();
      onChanged();
    } catch {
      setSkuNotice("Akcija nije uspela.");
    } finally {
      setSkuBusy(false);
    }
  };

  /** The menu switch, identical wherever a registry category is listed. */
  const renderMenuToggle = (child: RegistryChild) => (
    <label
      className={`flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
        child.showInMenu
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-500"
      } ${busyKey === `c${child.id}` ? "opacity-40" : ""}`}
      title={
        child.showInMenu
          ? "Stoji u meniju na sajtu. Klikni da je sklonis."
          : "Nije u meniju. Klikni da je dodas — prazna kategorija se svejedno prikazuje."
      }
    >
      <input
        type="checkbox"
        checked={child.showInMenu}
        disabled={busyKey === `c${child.id}`}
        onChange={(e) => void toggleChildInMenu(child, e.target.checked)}
      />
      u meniju
    </label>
  );

  const renderProductPanel = () => {
    if (!openTarget) return null;
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700">
            {openTarget.label}
            <span className="ml-2 font-normal text-slate-500">
              {productsLoading ? "ucitavanje..." : `${productTotal} artikala`}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setOpenTarget(null)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600"
          >
            Zatvori
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void applySku("add", skuInput);
            }}
            placeholder="SKU artikla, npr. 133342"
            className="w-56 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={skuBusy}
            onClick={() => void applySku("add", skuInput)}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 disabled:opacity-50"
          >
            {skuBusy ? "Radi..." : "Dodaj u kategoriju"}
          </button>
          <button
            type="button"
            disabled={skuBusy}
            onClick={() => void applySku("remove", skuInput)}
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 disabled:opacity-50"
          >
            Izbaci iz kategorije
          </button>
          <span className="text-[11px] text-slate-400">Jedan SKU = sve velicine tog modela.</span>
        </div>

        {skuNotice ? <p className="mt-2 text-xs text-slate-600">{skuNotice}</p> : null}

        {!productsLoading && productTotal === 0 ? (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            Ova kategorija je prazna, pa se <strong>ne prikazuje kupcima</strong> — meni preskace prazne kategorije da kupac
            ne bi otvorio praznu stranu. Dodaj bar jedan artikal preko SKU polja iznad i pojavice se za par minuta.
          </p>
        ) : null}

        <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white">
          {productsLoading ? (
            <p className="p-3 text-xs text-slate-400">Ucitavanje artikala...</p>
          ) : products.length === 0 ? (
            <p className="p-3 text-xs text-slate-400">Nema artikala u ovoj kategoriji.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                <tr>
                  <th className="px-3 py-2">Artikal</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Stanje</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const visible =
                    product.isActive !== false && product.isExported !== false && (product.stockTotal ?? 0) > 0 && product.coverImage;
                  return (
                    <tr key={product.legacyId} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{product.name}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{product.sku}</td>
                      <td className="px-3 py-2 text-slate-500">{product.stockTotal ?? 0}</td>
                      <td className="px-3 py-2">
                        <span className={visible ? "text-emerald-600" : "text-amber-600"}>
                          {visible ? "Vidljiv" : "Ne vidi se u shopu"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {productTotal > products.length ? (
            <p className="border-t border-slate-100 p-2 text-[11px] text-slate-400">
              Prikazano prvih {products.length} od {productTotal}.
            </p>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Kategorije koje kupci vide</p>
          <p className="text-xs text-slate-500">
            Isti izvor kao web-shop: aktivan + izvezen + ima sliku + spojene velicine. Klik na kategoriju otvara njene
            artikle. Sta stoji u meniju odlucuje cekboks &quot;u meniju&quot; — broj artikala vise nije uslov.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totals ? (
            <span className="text-[11px] text-slate-400">
              U shopu: <strong className="text-slate-600">{totals.liveProducts}</strong> / ukupno u bazi {totals.allProducts}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
              showAll ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 text-slate-600"
            }`}
            title="Sve kategorije koje postoje, sa brojem artikala"
          >
            Sve kategorije ({allCategories.length})
          </button>
          <button
            type="button"
            onClick={() => void loadTree()}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
          >
            Osvezi
          </button>
        </div>
      </div>

      {/* Legend: the colours carry meaning, so name it once instead of making
          the admin infer it from three different chip styles. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <StatusDot on />
          prikazuje se kupcima
        </span>
        <span className="flex items-center gap-1.5">
          <StatusDot on={false} />
          postoji, ali je iskljucena
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          automatska podkategorija (iz naziva artikala)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-400" />
          rucno kreirana — moze da se sakrije ili obrise
        </span>
        <span>Glavne kategorije se ne brisu, samo se iskljucuju.</span>
      </div>

      {error ? <p className="mb-3 rounded-xl bg-rose-50 p-2 text-xs text-rose-700">{error}</p> : null}
      {loading ? <p className="text-xs text-slate-400">Ucitavanje...</p> : null}

      <div className="grid gap-2">
        {groups.map((group) => {
          const groupTarget: Target = { kind: "group", key: group.key, label: group.name };
          const isOpen = openTarget?.kind === "group" && openTarget.key === group.key;
          /* No "empty means everything" fallback here: the API always answers with
             the resolved list, so an empty set really is "nothing in the menu",
             and pretending otherwise showed every group as on while the shop
             showed none. While loading, hold the last known state. */
          const groupOn = loading ? true : enabledGroups.has(group.key);
          return (
            <div key={group.key} className={`rounded-xl border p-3 ${groupOn ? "border-slate-200" : "border-slate-200 bg-slate-50/60"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleTarget(groupTarget)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isOpen ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
                  } ${groupOn ? "" : "opacity-60"}`}
                >
                  <StatusDot on={groupOn} />
                  {group.name}
                  <span className="opacity-70">{group.count}</span>
                </button>

                <label
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    groupOn
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  } ${busyKey === group.key ? "opacity-50" : ""}`}
                  title={
                    groupOn
                      ? "Kupci vide ovu kategoriju u meniju. Klikni da je sklonis."
                      : "Kupci NE vide ovu kategoriju. Klikni da je ukljucis u meni."
                  }
                >
                  <input
                    type="checkbox"
                    checked={groupOn}
                    disabled={busyKey === group.key}
                    onChange={(e) => void toggleGroupEnabled(group.key, e.target.checked)}
                  />
                  {/* Off state names the action, not the state: the old "Skrivena"
                      label read as a status nobody realised was also the switch. */}
                  {groupOn ? "U meniju" : "Ukljuci u meni"}
                </label>

                {group.subGroups.map((sub) => {
                  const subTarget: Target = { kind: "group", key: sub.key, label: `${group.name} / ${sub.name}` };
                  const subOpen = openTarget?.kind === "group" && openTarget.key === sub.key;
                  return (
                    <span
                      key={sub.key}
                      className={`inline-flex items-center rounded-full border pr-1 text-[11px] font-semibold transition-colors ${
                        subOpen ? "border-sky-500 bg-sky-500 text-white" : "border-sky-200 bg-sky-50 text-sky-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTarget(subTarget)}
                        className="px-3 py-1"
                        title="Automatska podkategorija — prepoznata iz naziva artikla"
                      >
                        ↳ {sub.name}
                        <span className="ml-1.5 opacity-70">{sub.count}</span>
                      </button>
                      {/* Automatic, so there is nothing to delete — but it can
                          stop being part of this main category. */}
                      <button
                        type="button"
                        disabled={busyKey === `s${sub.key}`}
                        onClick={() => void toggleSubGroupDetached(sub.key, true)}
                        className="rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] opacity-70 hover:bg-white/60 hover:opacity-100 disabled:opacity-40"
                        title={`Izbaci ${sub.name} iz kategorije ${group.name} — artikli vise nisu u toj kategoriji`}
                      >
                        izbaci
                      </button>
                    </span>
                  );
                })}

                {/* Detached sub-groups are gone from the tree, so the only place
                    they can be put back is under the parent they left. */}
                {allSubGroups
                  .filter((sub) => sub.parentKey === group.key && detachedSubGroups.has(sub.key))
                  .map((sub) => (
                    <span
                      key={sub.key}
                      className="inline-flex items-center rounded-full border border-dashed border-slate-300 bg-slate-50 pr-1 text-[11px] font-semibold text-slate-400"
                    >
                      <span className="px-3 py-1 line-through">↳ {sub.name}</span>
                      <button
                        type="button"
                        disabled={busyKey === `s${sub.key}`}
                        onClick={() => void toggleSubGroupDetached(sub.key, false)}
                        className="rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-500 hover:bg-white disabled:opacity-40"
                        title={`Vrati ${sub.name} u ${group.name}`}
                      >
                        vrati
                      </button>
                    </span>
                  ))}

                {group.registryChildren.map((child) => {
                  const childTarget: Target = { kind: "category", id: child.id, label: `${group.name} / ${child.name}` };
                  const childOpen = openTarget?.kind === "category" && openTarget.id === child.id;
                  /* What keeps this category out of the menu, if anything. Empty
                     is no longer a reason on its own — it is worth saying on the
                     chip, but the switch below is what decides. */
                  const hiddenReason = !child.isVisible
                    ? "sakrivena"
                    : !child.showInMenu
                      ? "nije u meniju"
                      : child.assigned === 0
                        ? "prazna"
                        : null;
                  return (
                    <span
                      key={child.id}
                      className={`inline-flex items-center gap-1 rounded-full border pr-1 text-[11px] font-semibold ${
                        childOpen
                          ? "border-violet-500 bg-violet-500 text-white"
                          : hiddenReason
                            ? "border-amber-300 bg-amber-50 text-amber-800"
                            : "border-violet-200 bg-violet-50 text-violet-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTarget(childTarget)}
                        className="flex items-center gap-1.5 px-3 py-1"
                        title={
                          hiddenReason
                            ? "Ne prikazuje se kupcima — klikni pa dodaj artikle po SKU"
                            : "Rucno kreirana podkategorija"
                        }
                      >
                        <StatusDot on={!hiddenReason} />↳ {child.name}
                        <span className="opacity-70">{child.sellable}</span>
                        {hiddenReason ? <span className="opacity-80">({hiddenReason})</span> : null}
                      </button>
                      {renderMenuToggle(child)}
                      <button
                        type="button"
                        disabled={busyKey === `c${child.id}`}
                        onClick={() => void renameChild(child)}
                        className="rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] opacity-70 hover:bg-white/60 hover:opacity-100 disabled:opacity-40"
                        title="Promeni naziv kategorije"
                      >
                        preimenuj
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `c${child.id}`}
                        onClick={() => void toggleChildVisible(child, !child.isVisible)}
                        className="rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] opacity-70 hover:bg-white/60 hover:opacity-100 disabled:opacity-40"
                        title={child.isVisible ? "Sakrij od kupaca" : "Prikazi kupcima"}
                      >
                        {child.isVisible ? "sakrij" : "prikazi"}
                      </button>
                      {/* Removing a subcategory from a menu is not the same as
                          deleting it. This detaches; the × still deletes. */}
                      <button
                        type="button"
                        disabled={busyKey === `c${child.id}`}
                        onClick={() => void detachChild(child)}
                        className="rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] opacity-70 hover:bg-white/60 hover:opacity-100 disabled:opacity-40"
                        title="Izbaci iz ove glavne kategorije (kategorija ostaje u sistemu)"
                      >
                        izbaci
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `c${child.id}`}
                        onClick={() => void deleteChild(child)}
                        className="rounded-full px-1.5 py-0.5 text-[12px] leading-none opacity-60 hover:bg-rose-100 hover:text-rose-700 hover:opacity-100 disabled:opacity-40"
                        title="Obrisi podkategoriju"
                        aria-label={`Obrisi ${child.name}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}

                {/* Two different jobs that used to be one button: file a category
                    that already exists under this group, or type a brand new one.
                    Only the second existed, so "add manzetne to Aksesoari" forced
                    a duplicate category instead of moving the real one. */}
                {attachGroup === group.key ? (
                  <select
                    autoFocus
                    value=""
                    className="rounded-full border border-slate-300 px-2 py-1 text-[11px] text-slate-700"
                    onChange={(e) => {
                      const picked = allCategories.find((row) => String(row.child.id) === e.target.value);
                      setAttachGroup(null);
                      if (picked) void setChildParent(picked.child, group.key);
                    }}
                  >
                    {/* No onBlur close: blur can land before change and the pick
                        is lost with the unmounted select. Cancel is the option
                        below instead. */}
                    <option value="">— izaberi postojecu kategoriju —</option>
                    {allCategories
                      .filter((row) => row.parentKey !== group.key)
                      .map((row) => (
                        <option key={row.child.id} value={row.child.id}>
                          {row.child.name} ({row.child.assigned}){" "}
                          {row.parentName ? `— sada u: ${row.parentName}` : "— bez nadkategorije"}
                        </option>
                      ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAttachGroup(group.key)}
                    className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                    title="Zakaci vec postojecu kategoriju pod ovu glavnu"
                  >
                    + postojeca podkategorija
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onCreateSubcategory(group.key, group.name)}
                  className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                  title="Napravi potpuno novu kategoriju pod ovom glavnom"
                >
                  + nova podkategorija
                </button>
              </div>

              {isOpen ||
              (openTarget?.kind === "group" && group.subGroups.some((sub) => sub.key === openTarget.key)) ||
              (openTarget?.kind === "category" && group.registryChildren.some((child) => child.id === openTarget.id))
                ? renderProductPanel()
                : null}
            </div>
          );
        })}
      </div>

      {/* The whole registry in one table. Until this existed the only way to see
          a category was to find the group it happened to be under, so duplicates
          like "Odelo" next to "Odela" were invisible and admins made a third. */}
      {showAll ? (
        <div className="mt-4 rounded-xl border border-slate-200 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-slate-700">Sve kategorije ({allCategories.length})</p>
            <input
              value={allFilter}
              onChange={(e) => setAllFilter(e.target.value)}
              placeholder="Trazi po imenu..."
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-700"
            />
          </div>
          <p className="mb-2 text-[11px] text-slate-500">
            Broj u zagradi = artikala dodeljeno / od toga kupci mogu da kupe. &quot;Stavi pod&quot; je dodaje u meni te
            glavne kategorije. &quot;Spoji u&quot; prebacuje sve njene artikle u drugu kategoriju i gasi ovu — za
            duplikate tipa Odelo/Odela.
          </p>
          <div className="grid gap-1">
            {allCategories
              .filter((row) => row.child.name.toLowerCase().includes(allFilter.trim().toLowerCase()))
              .map((row) => (
                <div
                  key={row.child.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1 odd:bg-slate-50/70"
                >
                  <button
                    type="button"
                    onClick={() => {
                      toggleTarget({ kind: "category", id: row.child.id, label: row.child.name });
                      setOpenedFromAll(true);
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700"
                    title="Prikazi artikle ove kategorije"
                  >
                    <StatusDot on={row.child.isVisible && row.child.sellable > 0} />
                    {row.child.name}
                  </button>
                  <span className="text-[11px] text-slate-500">
                    {row.child.assigned} / {row.child.sellable}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {row.parentName ? `u: ${row.parentName}` : "bez nadkategorije"}
                  </span>
                  {renderMenuToggle(row.child)}
                  <select
                    value=""
                    disabled={busyKey === `c${row.child.id}`}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      void setChildParent(row.child, e.target.value === "__none" ? "" : e.target.value);
                    }}
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-600"
                  >
                    <option value="">— stavi pod... —</option>
                    {PARENT_CHOICES.filter((choice) => choice.key !== row.parentKey).map((choice) => (
                      <option key={choice.key} value={choice.key}>
                        {choice.name}
                      </option>
                    ))}
                    {row.parentKey ? <option value="__none">— izbaci iz {row.parentName} —</option> : null}
                  </select>
                  <select
                    value=""
                    disabled={busyKey === `c${row.child.id}`}
                    onChange={(e) => e.target.value && void mergeInto(row.child, Number(e.target.value))}
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-600"
                    title="Spoji ovu kategoriju u drugu"
                  >
                    <option value="">— spoji u... —</option>
                    {allCategories
                      .filter((other) => other.child.id !== row.child.id)
                      .map((other) => (
                        <option key={other.child.id} value={other.child.id}>
                          {other.child.name} ({other.child.assigned})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={busyKey === `c${row.child.id}`}
                    onClick={() => void renameChild(row.child)}
                    className="rounded-full border border-slate-200 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-slate-500 disabled:opacity-40"
                    title="Promeni naziv kategorije"
                  >
                    preimenuj
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `c${row.child.id}`}
                    onClick={() => void toggleChildVisible(row.child, !row.child.isVisible)}
                    className="rounded-full border border-slate-200 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-slate-500 disabled:opacity-40"
                  >
                    {row.child.isVisible ? "sakrij" : "prikazi"}
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `c${row.child.id}`}
                    onClick={() => void deleteChild(row.child)}
                    className="rounded-full border border-rose-200 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-rose-600 disabled:opacity-40"
                  >
                    obrisi
                  </button>
                </div>
              ))}
          </div>
          {openTarget?.kind === "category" && openedFromAll ? renderProductPanel() : null}
        </div>
      ) : null}

      {orphans.length > 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3">
          <p className="text-xs font-semibold text-slate-700">Kategorije bez nadkategorije ({orphans.length})</p>
          <p className="mb-2 text-[11px] text-slate-500">
            Postoje u sistemu, ali ne vise ni pod jednom glavnom kategorijom. Cekiraj &quot;u meniju&quot; i kategorija ide
            u glavni meni kao zasebna stavka, uz Odela i Sakoe. Ili joj izaberi nadkategoriju, ili je obrisi.
          </p>
          <div className="grid gap-2">
            {orphans.map((orphan) => {
              const orphanTarget: Target = { kind: "category", id: orphan.id, label: orphan.name };
              const isOpenOrphan = openTarget?.kind === "category" && openTarget.id === orphan.id;
              return (
                <div key={orphan.id} className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleTarget(orphanTarget)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                      isOpenOrphan ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <StatusDot on={orphan.isVisible && orphan.sellable > 0} />
                    {orphan.name}
                    <span className="opacity-70">{orphan.sellable}</span>
                  </button>
                  {renderMenuToggle(orphan)}
                  <select
                    value=""
                    disabled={busyKey === `c${orphan.id}`}
                    onChange={(e) => e.target.value && void setChildParent(orphan, e.target.value)}
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-600"
                    title="Prebaci pod glavnu kategoriju"
                  >
                    <option value="">— stavi pod... —</option>
                    {PARENT_CHOICES.map((choice) => (
                      <option key={choice.key} value={choice.key}>
                        {choice.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busyKey === `c${orphan.id}`}
                    onClick={() => void renameChild(orphan)}
                    className="rounded-full border border-slate-200 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-slate-500 disabled:opacity-40"
                    title="Promeni naziv kategorije"
                  >
                    preimenuj
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `c${orphan.id}`}
                    onClick={() => void toggleChildVisible(orphan, !orphan.isVisible)}
                    className="rounded-full border border-slate-200 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-slate-500 disabled:opacity-40"
                  >
                    {orphan.isVisible ? "sakrij" : "prikazi"}
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `c${orphan.id}`}
                    onClick={() => void deleteChild(orphan)}
                    className="rounded-full border border-rose-200 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-rose-600 disabled:opacity-40"
                  >
                    obrisi
                  </button>
                  {orphan.assigned > 0 ? (
                    <span className="text-[11px] text-slate-400">{orphan.assigned} artikala dodeljeno</span>
                  ) : null}
                </div>
              );
            })}
          </div>
          {openTarget?.kind === "category" && orphans.some((orphan) => orphan.id === openTarget.id)
            ? renderProductPanel()
            : null}
        </div>
      ) : null}
    </div>
  );
}

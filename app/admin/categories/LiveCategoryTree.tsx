"use client";

import { useCallback, useEffect, useState } from "react";

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
  isLive: boolean;
};

type LiveGroup = {
  key: string;
  name: string;
  count: number;
  subGroups: SubGroup[];
  registryChildren: RegistryChild[];
};

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

export default function LiveCategoryTree({
  onChanged,
  onCreateSubcategory,
}: {
  onChanged: () => void;
  onCreateSubcategory: (groupKey: string, groupName: string) => void;
}) {
  const [groups, setGroups] = useState<LiveGroup[]>([]);
  const [totals, setTotals] = useState<{ liveProducts: number; allProducts: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openTarget, setOpenTarget] = useState<Target | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productsLoading, setProductsLoading] = useState(false);

  const [skuInput, setSkuInput] = useState("");
  const [skuBusy, setSkuBusy] = useState(false);
  const [skuNotice, setSkuNotice] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/categories/overview");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Ucitavanje kategorija nije uspelo.");
        return;
      }
      setGroups(json.groups || []);
      setTotals(json.totals || null);
    } catch {
      setError("Ucitavanje kategorija nije uspelo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

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
            Isti izvor kao web-shop: aktivan + izvezen + ima sliku + spojene velicine. Klik na kategoriju otvara njene artikle.
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
            onClick={() => void loadTree()}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
          >
            Osvezi
          </button>
        </div>
      </div>

      {error ? <p className="mb-3 rounded-xl bg-rose-50 p-2 text-xs text-rose-700">{error}</p> : null}
      {loading ? <p className="text-xs text-slate-400">Ucitavanje...</p> : null}

      <div className="grid gap-2">
        {groups.map((group) => {
          const groupTarget: Target = { kind: "group", key: group.key, label: group.name };
          const isOpen = openTarget?.kind === "group" && openTarget.key === group.key;
          return (
            <div key={group.key} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleTarget(groupTarget)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isOpen ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {group.name}
                  <span className="ml-2 opacity-70">{group.count}</span>
                </button>

                {group.subGroups.map((sub) => {
                  const subTarget: Target = { kind: "group", key: sub.key, label: `${group.name} / ${sub.name}` };
                  const subOpen = openTarget?.kind === "group" && openTarget.key === sub.key;
                  return (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => toggleTarget(subTarget)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                        subOpen ? "border-sky-500 bg-sky-500 text-white" : "border-sky-200 bg-sky-50 text-sky-700"
                      }`}
                      title="Automatska podkategorija — prepoznata iz naziva artikla"
                    >
                      ↳ {sub.name}
                      <span className="ml-1.5 opacity-70">{sub.count}</span>
                    </button>
                  );
                })}

                {group.registryChildren.map((child) => {
                  const childTarget: Target = { kind: "category", id: child.id, label: `${group.name} / ${child.name}` };
                  const childOpen = openTarget?.kind === "category" && openTarget.id === child.id;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => toggleTarget(childTarget)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                        childOpen ? "border-violet-500 bg-violet-500 text-white" : "border-violet-200 bg-violet-50 text-violet-700"
                      }`}
                      title="Rucno kreirana podkategorija"
                    >
                      ↳ {child.name}
                      {!child.isVisible ? <span className="ml-1.5 opacity-70">(sakrivena)</span> : null}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => onCreateSubcategory(group.key, group.name)}
                  className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                >
                  + podkategorija
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
    </div>
  );
}

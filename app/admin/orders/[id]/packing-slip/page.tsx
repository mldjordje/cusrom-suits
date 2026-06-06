import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";
import { readPersistentJsonFile } from "@/lib/storage/persistentJson";
import { getServiceSupabase } from "@/lib/supabase/server";
import { formatPublicOrderNumber } from "@/lib/orders/publicOrderNumber";

export const dynamic = "force-dynamic";

const ORDERS_PATH = "data/orders.json";

type OrderRecord = {
  id: string;
  created_at?: string | null;
  status?: string | null;
  price?: number | null;
  contact?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  note?: string | null;
};

const formatRsd = (value: number | null | undefined) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("sr-RS", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
};

const getString = (obj: Record<string, unknown> | null | undefined, key: string): string => {
  if (!obj) return "";
  const value = obj[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const getNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

async function loadOrder(id: string): Promise<OrderRecord | null> {
  const supabase = getServiceSupabase();
  if (supabase) {
    const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    return (data as OrderRecord | null) ?? null;
  }
  const orders = await readPersistentJsonFile<OrderRecord[]>(ORDERS_PATH, []);
  return orders.find((o) => String(o.id) === String(id)) ?? null;
}

export default async function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await loadOrder(id);
  if (!order) notFound();

  const contact = (order.contact || {}) as Record<string, unknown>;
  const config = (order.config || {}) as Record<string, unknown>;
  const displayOrderNumber = formatPublicOrderNumber(order);

  const name = getString(contact, "ime") || getString(contact, "name") || "-";
  const lastName = getString(contact, "prezime") || getString(contact, "lastName");
  const fullName = [name, lastName].filter(Boolean).join(" ").trim() || "-";
  const phone = getString(contact, "telefon") || getString(contact, "phone");
  const email = getString(contact, "email");
  const address = getString(contact, "adresa") || getString(contact, "address");
  const city = getString(contact, "grad") || getString(contact, "city");
  const postalCode = getString(contact, "postanski") || getString(contact, "postalCode") || getString(contact, "zip");
  const country = getString(contact, "drzava") || getString(contact, "country") || "Srbija";

  const rawItems = Array.isArray(config.items) ? (config.items as unknown[]) : [];
  const items = rawItems.map((item) => {
    const row = (item || {}) as Record<string, unknown>;
    return {
      name: getString(row, "name") || "-",
      size: getString(row, "size"),
      quantity: getNumber(row.quantity) || 1,
      price: getNumber(row.price),
    };
  });

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = typeof order.price === "number" ? order.price : items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const fulfillmentMethod = getString(config, "fulfillmentMethod") || getString(config, "deliveryMethod");
  const paymentMethod = getString(config, "paymentMethod");
  const note = typeof order.note === "string" ? order.note : getString(config, "note");

  return (
    <div className="packing-slip">
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            :root { color-scheme: only light; }
            body { background: #f1f5f9; }
            .packing-slip { max-width: 780px; margin: 24px auto; padding: 0 16px; color: #111827; font-family: "Helvetica Neue", Arial, sans-serif; }
            .packing-slip__actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 16px; }
            .packing-slip__actions a, .packing-slip__actions button { background: #111827; color: #fff; border: 0; padding: 8px 14px; border-radius: 8px; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer; text-decoration: none; }
            .packing-slip__actions a.ghost { background: transparent; color: #111827; border: 1px solid #cbd5e1; }
            .packing-slip__sheet { background: #fff; padding: 28px 32px; border-radius: 6px; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08); }
            .packing-slip__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 20px; }
            .packing-slip__brand { font-size: 20px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
            .packing-slip__brand small { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.12em; color: #6b7280; margin-top: 4px; }
            .packing-slip__meta { text-align: right; font-size: 13px; line-height: 1.5; color: #374151; }
            .packing-slip__meta strong { display: block; font-size: 16px; color: #111827; margin-bottom: 2px; }
            .packing-slip__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 22px; }
            .packing-slip__card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; font-size: 13px; line-height: 1.55; color: #1f2937; }
            .packing-slip__card h3 { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280; margin: 0 0 6px 0; font-weight: 600; }
            .packing-slip__card p { margin: 0; }
            .packing-slip__table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            .packing-slip__table th, .packing-slip__table td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; font-size: 13px; text-align: left; }
            .packing-slip__table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 600; }
            .packing-slip__table td.right, .packing-slip__table th.right { text-align: right; }
            .packing-slip__totals { display: flex; justify-content: flex-end; margin-top: 10px; }
            .packing-slip__totals table { border-collapse: collapse; min-width: 260px; }
            .packing-slip__totals td { padding: 6px 0; font-size: 13px; }
            .packing-slip__totals td:last-child { text-align: right; font-weight: 600; }
            .packing-slip__totals tr.total td { border-top: 2px solid #111827; padding-top: 10px; font-size: 15px; font-weight: 700; text-transform: uppercase; }
            .packing-slip__note { margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 14px; font-size: 13px; color: #374151; }
            .packing-slip__signature { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 12px; color: #6b7280; }
            .packing-slip__signature span { display: block; border-top: 1px solid #111827; padding-top: 6px; text-transform: uppercase; letter-spacing: 0.14em; }
            .packing-slip__footer { margin-top: 24px; text-align: center; font-size: 11px; color: #6b7280; letter-spacing: 0.1em; text-transform: uppercase; }
            @media print {
              body { background: #fff; }
              .packing-slip { margin: 0; padding: 0; }
              .packing-slip__actions { display: none; }
              .packing-slip__sheet { box-shadow: none; padding: 12mm; border-radius: 0; }
            }
            @page { size: A4; margin: 10mm; }
          `,
        }}
      />
      <div className="packing-slip__actions">
        <Link href="/admin/orders" className="ghost">
          &larr; Nazad na porudzbine
        </Link>
        <PrintButton />
      </div>
      <div className="packing-slip__sheet">
        <header className="packing-slip__head">
          <div className="packing-slip__brand">
            Santos &amp; Santorini
            <small>Moda za gospodu &middot; Srbija</small>
          </div>
          <div className="packing-slip__meta">
            <strong>Otpremnica</strong>
            Porudzbina: {displayOrderNumber}
            {displayOrderNumber !== String(order.id) ? (
              <>
                <br />
                Interni ID: {order.id}
              </>
            ) : null}
            <br />
            Datum: {formatDate(order.created_at)}
            <br />
            Status: {order.status || "pending"}
          </div>
        </header>

        <section className="packing-slip__grid">
          <div className="packing-slip__card">
            <h3>Primalac</h3>
            <p>
              <strong>{fullName}</strong>
              {phone ? <>{"\n"}Tel: {phone}</> : null}
              {email ? <>{"\n"}Email: {email}</> : null}
            </p>
          </div>
          <div className="packing-slip__card">
            <h3>Adresa za isporuku</h3>
            <p>
              {address || "-"}
              {postalCode || city ? <>{"\n"}{[postalCode, city].filter(Boolean).join(" ")}</> : null}
              {country ? <>{"\n"}{country}</> : null}
            </p>
          </div>
        </section>

        {fulfillmentMethod || paymentMethod ? (
          <section className="packing-slip__grid">
            {fulfillmentMethod ? (
              <div className="packing-slip__card">
                <h3>Nacin isporuke</h3>
                <p>{fulfillmentMethod}</p>
              </div>
            ) : null}
            {paymentMethod ? (
              <div className="packing-slip__card">
                <h3>Nacin placanja</h3>
                <p>{paymentMethod}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        <table className="packing-slip__table">
          <thead>
            <tr>
              <th style={{ width: "52%" }}>Proizvod</th>
              <th>Velicina</th>
              <th className="right">Kol.</th>
              <th className="right">Cena</th>
              <th className="right">Ukupno</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.size || "-"}</td>
                  <td className="right">{item.quantity}</td>
                  <td className="right">{formatRsd(item.price)}</td>
                  <td className="right">{formatRsd(item.price * item.quantity)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af" }}>
                  Nema stavki u ovoj porudzbini
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="packing-slip__totals">
          <table>
            <tbody>
              <tr>
                <td>Broj artikala</td>
                <td>{totalQuantity}</td>
              </tr>
              <tr className="total">
                <td>Ukupno za naplatu</td>
                <td>{formatRsd(totalPrice)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {note ? (
          <div className="packing-slip__note">
            <strong>Napomena kupca:</strong> {note}
          </div>
        ) : null}

        <div className="packing-slip__signature">
          <div>
            <span>Paket pripremio</span>
          </div>
          <div>
            <span>Potpis primaoca</span>
          </div>
        </div>

        <div className="packing-slip__footer">
          Hvala sto kupujete u Santos &amp; Santorini &middot; santos.rs
        </div>
      </div>
    </div>
  );
}

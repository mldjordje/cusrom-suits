const BRAND_BLACK = "#0f0f0f";
const BRAND_GOLD = "#b58f49";
const BRAND_CREAM = "#f7f6f3";

const escape = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const formatRsd = (value: number) => {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(safe);
};

type Layout = {
  title: string;
  preheader?: string;
  body: string;
};

const shell = ({ title, preheader, body }: Layout) => `<!doctype html>
<html lang="sr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escape(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND_CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
    ${
      preheader
        ? `<div style="display:none;max-height:0;overflow:hidden;color:${BRAND_CREAM};opacity:0;">${escape(preheader)}</div>`
        : ""
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_CREAM};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 36px rgba(15,15,15,0.08);">
            <tr>
              <td style="background:${BRAND_BLACK};padding:24px 32px;text-align:center;">
                <div style="color:${BRAND_GOLD};font-size:11px;letter-spacing:0.24em;text-transform:uppercase;">Santos &amp; Santorini</div>
                <div style="color:#ffffff;font-size:20px;font-weight:600;margin-top:4px;letter-spacing:0.02em;">${escape(title)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#1a1a1a;font-size:15px;line-height:1.55;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="background:${BRAND_BLACK};color:${BRAND_CREAM};padding:18px 32px;text-align:center;font-size:12px;line-height:1.5;">
                Santos &amp; Santorini &middot; Niš, Srbija<br />
                <a href="https://santos.rs" style="color:${BRAND_GOLD};text-decoration:none;">santos.rs</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export type OrderEmailItem = {
  name: string;
  size?: string | null;
  quantity: number;
  price: number;
};

export type OrderEmailContext = {
  orderId: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    postalCode?: string;
    note?: string;
  };
  fulfillment: {
    method: "delivery" | "pickup";
    pickupStoreLabel?: string | null;
    deliveryServiceName?: string | null;
    deliveryCost: number;
  };
  totals: {
    subtotal: number;
    deliveryCost: number;
    voucherDiscount: number;
    finalTotal: number;
  };
  voucherCode?: string | null;
  items: OrderEmailItem[];
};

const itemsTable = (items: OrderEmailItem[]) => {
  if (!items.length) return "";
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eceae4;">
            <div style="font-weight:600;">${escape(item.name)}</div>
            ${item.size ? `<div style="font-size:12px;color:#666;">Veličina: ${escape(item.size)}</div>` : ""}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eceae4;text-align:center;white-space:nowrap;">${escape(item.quantity)}×</td>
          <td style="padding:10px 0;border-bottom:1px solid #eceae4;text-align:right;white-space:nowrap;">${escape(
            formatRsd(item.price * item.quantity),
          )}</td>
        </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      <thead>
        <tr style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">
          <th align="left" style="padding-bottom:8px;">Proizvod</th>
          <th align="center" style="padding-bottom:8px;">Kol.</th>
          <th align="right" style="padding-bottom:8px;">Ukupno</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

const totalsBlock = (totals: OrderEmailContext["totals"], voucherCode?: string | null) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr>
      <td style="padding:4px 0;color:#555;">Medjuzbir</td>
      <td style="padding:4px 0;text-align:right;">${escape(formatRsd(totals.subtotal))}</td>
    </tr>
    ${
      totals.deliveryCost > 0
        ? `<tr><td style="padding:4px 0;color:#555;">Dostava</td><td style="padding:4px 0;text-align:right;">${escape(
            formatRsd(totals.deliveryCost),
          )}</td></tr>`
        : ""
    }
    ${
      totals.voucherDiscount > 0
        ? `<tr><td style="padding:4px 0;color:#555;">Popust${
            voucherCode ? ` (${escape(voucherCode)})` : ""
          }</td><td style="padding:4px 0;text-align:right;color:#1a7a4c;">&minus; ${escape(
            formatRsd(totals.voucherDiscount),
          )}</td></tr>`
        : ""
    }
    <tr>
      <td style="padding:10px 0 0;border-top:1px solid #111;font-weight:700;font-size:16px;">Ukupno</td>
      <td style="padding:10px 0 0;border-top:1px solid #111;text-align:right;font-weight:700;font-size:16px;">${escape(
        formatRsd(totals.finalTotal),
      )}</td>
    </tr>
  </table>`;

export const buildCustomerOrderEmail = (ctx: OrderEmailContext) => {
  const fulfillmentText =
    ctx.fulfillment.method === "pickup"
      ? `Preuzimanje: ${ctx.fulfillment.pickupStoreLabel || "u radnji"}`
      : `Dostava: ${ctx.fulfillment.deliveryServiceName || "kurirska služba"}`;

  const body = `
    <p style="margin:0 0 12px;">Poštovani/a ${escape(ctx.customer.fullName)},</p>
    <p style="margin:0 0 16px;">
      Hvala na porudžbini. Tvoj zahtev je zabeležen i naš tim će te pozvati u roku od 2 sata
      (Pon-Sub, 09-20h) radi potvrde veličine, dostave i načina plaćanja.
    </p>
    <div style="background:${BRAND_CREAM};border-radius:12px;padding:16px 18px;margin:16px 0;">
      <div style="font-size:12px;color:#666;letter-spacing:0.08em;text-transform:uppercase;">Broj porudžbine</div>
      <div style="font-size:18px;font-weight:700;margin-top:2px;">#${escape(ctx.orderId)}</div>
      <div style="font-size:13px;color:#444;margin-top:8px;">${escape(fulfillmentText)}</div>
    </div>
    ${itemsTable(ctx.items)}
    ${totalsBlock(ctx.totals, ctx.voucherCode)}
    <p style="margin:24px 0 0;color:#555;font-size:13px;line-height:1.5;">
      Ako se ne javimo u roku od 2 sata, slobodno nas kontaktiraj na
      <a href="mailto:info@santos.rs" style="color:${BRAND_BLACK};">info@santos.rs</a>.<br />
      Sačuvaj broj porudžbine ispod radi bržeg servisa.
    </p>
  `;

  return {
    subject: `Primljena porudžbina #${ctx.orderId} - Santos & Santorini`,
    html: shell({
      title: "Porudžbina primljena",
      preheader: `Broj porudžbine #${ctx.orderId}. Javićemo se u roku od 2 sata.`,
      body,
    }),
    text:
      `Hvala na porudžbini, ${ctx.customer.fullName}.\n` +
      `Broj porudžbine: #${ctx.orderId}\n` +
      `Ukupno: ${formatRsd(ctx.totals.finalTotal)}\n` +
      `${fulfillmentText}\n\n` +
      `Naš tim će te pozvati u roku od 2 sata (Pon-Sub, 09-20h).\n` +
      `Pitanja: info@santos.rs`,
  };
};

export const buildAdminOrderEmail = (ctx: OrderEmailContext, adminOrderUrl: string) => {
  const addressLine = [ctx.customer.address, ctx.customer.city, ctx.customer.postalCode]
    .filter(Boolean)
    .join(", ");

  const body = `
    <p style="margin:0 0 8px;font-size:13px;color:#666;letter-spacing:0.08em;text-transform:uppercase;">Nova porudžbina</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;">#${escape(ctx.orderId)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <tr>
        <td style="padding:4px 0;color:#666;width:130px;">Kupac</td>
        <td style="padding:4px 0;">${escape(ctx.customer.fullName)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#666;">Email</td>
        <td style="padding:4px 0;"><a href="mailto:${escape(ctx.customer.email)}" style="color:${BRAND_BLACK};">${escape(ctx.customer.email)}</a></td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#666;">Telefon</td>
        <td style="padding:4px 0;"><a href="tel:${escape(ctx.customer.phone)}" style="color:${BRAND_BLACK};">${escape(ctx.customer.phone)}</a></td>
      </tr>
      ${
        addressLine
          ? `<tr><td style="padding:4px 0;color:#666;vertical-align:top;">Adresa</td><td style="padding:4px 0;">${escape(addressLine)}</td></tr>`
          : ""
      }
      <tr>
        <td style="padding:4px 0;color:#666;">Metod</td>
        <td style="padding:4px 0;">${
          ctx.fulfillment.method === "pickup"
            ? `Preuzimanje: ${escape(ctx.fulfillment.pickupStoreLabel || "radnja")}`
            : `Dostava: ${escape(ctx.fulfillment.deliveryServiceName || "kurirska služba")}`
        }</td>
      </tr>
      ${
        ctx.voucherCode
          ? `<tr><td style="padding:4px 0;color:#666;">Vaučer</td><td style="padding:4px 0;"><strong>${escape(ctx.voucherCode)}</strong></td></tr>`
          : ""
      }
      ${
        ctx.customer.note
          ? `<tr><td style="padding:4px 0;color:#666;vertical-align:top;">Napomena</td><td style="padding:4px 0;white-space:pre-line;">${escape(ctx.customer.note)}</td></tr>`
          : ""
      }
    </table>
    ${itemsTable(ctx.items)}
    ${totalsBlock(ctx.totals, ctx.voucherCode)}
    <div style="margin-top:24px;text-align:center;">
      <a href="${escape(adminOrderUrl)}" style="display:inline-block;background:${BRAND_BLACK};color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;letter-spacing:0.05em;">Otvori u admin panelu</a>
    </div>
  `;

  return {
    subject: `Nova porudžbina #${ctx.orderId} - ${formatRsd(ctx.totals.finalTotal)}`,
    html: shell({
      title: `Nova porudžbina #${ctx.orderId}`,
      preheader: `${ctx.customer.fullName} - ${formatRsd(ctx.totals.finalTotal)}`,
      body,
    }),
    text:
      `Nova porudžbina #${ctx.orderId}\n` +
      `Kupac: ${ctx.customer.fullName}\n` +
      `Email: ${ctx.customer.email}\n` +
      `Telefon: ${ctx.customer.phone}\n` +
      (addressLine ? `Adresa: ${addressLine}\n` : "") +
      `Ukupno: ${formatRsd(ctx.totals.finalTotal)}\n` +
      `Metod: ${
        ctx.fulfillment.method === "pickup"
          ? `Preuzimanje - ${ctx.fulfillment.pickupStoreLabel || "radnja"}`
          : `Dostava - ${ctx.fulfillment.deliveryServiceName || "kurirska"}`
      }\n` +
      (ctx.voucherCode ? `Vaučer: ${ctx.voucherCode}\n` : "") +
      (ctx.customer.note ? `Napomena: ${ctx.customer.note}\n` : "") +
      `\nAdmin: ${adminOrderUrl}`,
  };
};

export type OrderStatusUpdateContext = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  newStatus: "pending" | "confirmed" | "completed" | "cancelled" | string;
  previousStatus?: string | null;
  finalTotal?: number;
  trackingNote?: string | null;
};

const STATUS_COPY: Record<
  string,
  { title: string; preheader: string; heading: string; body: string }
> = {
  confirmed: {
    title: "Porudžbina potvrđena",
    preheader: "Potvrdili smo tvoju porudžbinu",
    heading: "Potvrdili smo tvoju porudžbinu",
    body:
      "Uspešno smo potvrdili tvoju porudžbinu i pripremamo je za isporuku. Javićemo ti se ponovo čim bude poslata.",
  },
  completed: {
    title: "Porudžbina završena",
    preheader: "Tvoja porudžbina je uspešno završena",
    heading: "Hvala, porudžbina je završena",
    body:
      "Tvoja porudžbina je uspešno završena. Nadamo se da si zadovoljan/na — tvoje mišljenje nam puno znači. Slobodno odgovori na ovaj mail ukoliko želiš da podeliš utiske.",
  },
  cancelled: {
    title: "Porudžbina otkazana",
    preheader: "Tvoja porudžbina je otkazana",
    heading: "Porudžbina je otkazana",
    body:
      "Nažalost, tvoja porudžbina je otkazana. Ako je otkaz pogrešno zabeležen ili želiš da je vratimo u obradu, odgovori na ovaj mail ili nas pozovi i rešićemo u najkraćem roku.",
  },
  pending: {
    title: "Porudžbina evidentirana",
    preheader: "Primili smo tvoju porudžbinu",
    heading: "Primili smo tvoju porudžbinu",
    body:
      "Tvoja porudžbina je evidentirana. Naš tim će te pozvati u roku od 2 sata (Pon-Sub, 09-20h) radi potvrde.",
  },
};

export const buildCustomerStatusUpdateEmail = (ctx: OrderStatusUpdateContext) => {
  const copy = STATUS_COPY[ctx.newStatus] || {
    title: "Status porudžbine ažuriran",
    preheader: `Nova status oznaka: ${ctx.newStatus}`,
    heading: "Status porudžbine je ažuriran",
    body: `Status tvoje porudžbine je promenjen u "${ctx.newStatus}". Slobodno nas kontaktiraj ako želiš detalje.`,
  };

  const body = `
    <p style="margin:0 0 12px;">Poštovani/a ${escape(ctx.customerName)},</p>
    <p style="margin:0 0 16px;">${escape(copy.body)}</p>
    <div style="background:${BRAND_CREAM};border-radius:12px;padding:16px 18px;margin:16px 0;">
      <div style="font-size:12px;color:#666;letter-spacing:0.08em;text-transform:uppercase;">Broj porudžbine</div>
      <div style="font-size:18px;font-weight:700;margin-top:2px;">#${escape(ctx.orderId)}</div>
      ${
        typeof ctx.finalTotal === "number" && ctx.finalTotal > 0
          ? `<div style="font-size:13px;color:#444;margin-top:8px;">Iznos: <strong>${escape(formatRsd(ctx.finalTotal))}</strong></div>`
          : ""
      }
    </div>
    ${
      ctx.trackingNote
        ? `<p style="margin:0 0 12px;padding:12px 14px;background:#fff7e6;border-left:3px solid ${BRAND_GOLD};font-size:14px;white-space:pre-line;">${escape(ctx.trackingNote)}</p>`
        : ""
    }
    <p style="margin:24px 0 0;color:#555;font-size:13px;line-height:1.5;">
      Pitanja? Odgovori na ovaj mail ili piši na
      <a href="mailto:info@santos.rs" style="color:${BRAND_BLACK};">info@santos.rs</a>.
    </p>
  `;

  return {
    subject: `${copy.title} - #${ctx.orderId} - Santos & Santorini`,
    html: shell({ title: copy.heading, preheader: copy.preheader, body }),
    text:
      `${copy.heading}\n\n` +
      `${copy.body}\n\n` +
      `Broj porudžbine: #${ctx.orderId}\n` +
      (ctx.finalTotal ? `Iznos: ${formatRsd(ctx.finalTotal)}\n` : "") +
      (ctx.trackingNote ? `\nNapomena: ${ctx.trackingNote}\n` : "") +
      `\nPitanja: info@santos.rs`,
  };
};

export type NewsletterWelcomeContext = {
  email: string;
  discountCode?: string | null;
};

export const buildNewsletterWelcomeEmail = (ctx: NewsletterWelcomeContext) => {
  const hasCode = Boolean(ctx.discountCode);
  const body = `
    <p style="margin:0 0 12px;">Dobro došao/la u Santos &amp; Santorini inbox.</p>
    <p style="margin:0 0 16px;">
      Prvi ćeš saznati za nove kolekcije, interne popuste i limitirane komade. Bez spama — pišemo samo
      kad imamo nešto zaista vredno.
    </p>
    ${
      hasCode
        ? `<div style="background:${BRAND_BLACK};color:#ffffff;border-radius:12px;padding:18px 20px;margin:16px 0;text-align:center;">
             <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND_GOLD};">Welcome popust</div>
             <div style="font-size:22px;font-weight:700;letter-spacing:0.08em;margin-top:6px;">${escape(
               ctx.discountCode!,
             )}</div>
             <div style="font-size:12px;margin-top:6px;color:#d8d6d2;">Iskoristi na <a href="https://santos.rs/web-shop" style="color:${BRAND_GOLD};text-decoration:underline;">santos.rs/web-shop</a></div>
           </div>`
        : ""
    }
    <p style="margin:16px 0 0;color:#555;font-size:13px;line-height:1.5;">
      Ako si se pretplatio greškom, samo odgovori na ovaj mail i odjavićemo te u roku od 24h.
    </p>
  `;

  return {
    subject: "Dobrodošao u Santos & Santorini",
    html: shell({
      title: "Dobrodošao/la",
      preheader: hasCode
        ? `Welcome popust: ${ctx.discountCode}`
        : "Prvi saznaješ za nove kolekcije i interne popuste.",
      body,
    }),
    text:
      `Dobrodošao/la u Santos & Santorini.\n\n` +
      `Prvi ćeš saznati za nove kolekcije i interne popuste.\n` +
      (hasCode ? `\nWelcome popust kod: ${ctx.discountCode}\nIskoristi na santos.rs/web-shop\n` : "") +
      `\nOdjava: odgovori na ovaj mail.`,
  };
};

export type ContactEmailContext = {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  preferredStore?: string;
  source?: string;
  adminUrl: string;
};

export const buildAdminContactEmail = (ctx: ContactEmailContext) => {
  const body = `
    <p style="margin:0 0 16px;">Nova poruka sa kontakt forme.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <tr>
        <td style="padding:4px 0;color:#666;width:130px;">Ime</td>
        <td style="padding:4px 0;">${escape(ctx.name)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#666;">Email</td>
        <td style="padding:4px 0;"><a href="mailto:${escape(ctx.email)}" style="color:${BRAND_BLACK};">${escape(ctx.email)}</a></td>
      </tr>
      ${
        ctx.phone
          ? `<tr><td style="padding:4px 0;color:#666;">Telefon</td><td style="padding:4px 0;"><a href="tel:${escape(ctx.phone)}" style="color:${BRAND_BLACK};">${escape(ctx.phone)}</a></td></tr>`
          : ""
      }
      ${
        ctx.subject
          ? `<tr><td style="padding:4px 0;color:#666;">Tema</td><td style="padding:4px 0;">${escape(ctx.subject)}</td></tr>`
          : ""
      }
      ${
        ctx.preferredStore
          ? `<tr><td style="padding:4px 0;color:#666;">Lokacija</td><td style="padding:4px 0;">${escape(ctx.preferredStore)}</td></tr>`
          : ""
      }
      ${
        ctx.source
          ? `<tr><td style="padding:4px 0;color:#666;">Kanal</td><td style="padding:4px 0;">${escape(ctx.source)}</td></tr>`
          : ""
      }
    </table>
    <div style="margin-top:16px;padding:16px 18px;background:${BRAND_CREAM};border-radius:12px;white-space:pre-line;">${escape(
      ctx.message,
    )}</div>
    <div style="margin-top:24px;text-align:center;">
      <a href="${escape(ctx.adminUrl)}" style="display:inline-block;background:${BRAND_BLACK};color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;letter-spacing:0.05em;">Otvori inbox</a>
    </div>
  `;

  return {
    subject: `Nova poruka - ${ctx.name}`,
    html: shell({
      title: "Nova kontakt poruka",
      preheader: `${ctx.name}${ctx.subject ? ` - ${ctx.subject}` : ""}`,
      body,
    }),
    text:
      `Nova kontakt poruka\n` +
      `Ime: ${ctx.name}\n` +
      `Email: ${ctx.email}\n` +
      (ctx.phone ? `Telefon: ${ctx.phone}\n` : "") +
      (ctx.subject ? `Tema: ${ctx.subject}\n` : "") +
      (ctx.preferredStore ? `Lokacija: ${ctx.preferredStore}\n` : "") +
      (ctx.source ? `Kanal: ${ctx.source}\n` : "") +
      `\nPoruka:\n${ctx.message}\n` +
      `\nAdmin: ${ctx.adminUrl}`,
  };
};

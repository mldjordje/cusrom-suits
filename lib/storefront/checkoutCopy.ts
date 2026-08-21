/**
 * Every piece of text on the checkout page, in one editable list.
 *
 * The copy used to be inline ternaries, so changing "Posalji porudzbinu" meant a
 * deploy. Admins edit these in /admin/fulfillment instead; anything they leave
 * blank falls back to the default below, which is the wording that shipped.
 */

export type CheckoutCopyField = {
  key: string;
  /** Serbian default. */
  sr: string;
  /** English default. */
  en: string;
};

/** Order matters: this is the order the admin form lists the fields in. */
export const CHECKOUT_COPY_FIELDS: CheckoutCopyField[] = [
  { key: "invalidVoucher", sr: "Neispravan vaucer.", en: "Invalid voucher." },
  { key: "couldNotValidateVoucher", sr: "Greska pri proveri vaucera.", en: "Could not validate voucher." },
  { key: "enterNameEmailAndPhoneBeforeSubmittingTh", sr: "Unesi ime, email i telefon pre slanja porudzbine.", en: "Enter name, email and phone before submitting the order." },
  { key: "selectAPickupStoreBeforeSendingTheOrder", sr: "Izaberi radnju za preuzimanje pre slanja porudzbine.", en: "Select a pickup store before sending the order." },
  { key: "selectADeliveryServiceBeforeSendingTheOr", sr: "Izaberi kurirsku sluzbu pre slanja porudzbine.", en: "Select a delivery service before sending the order." },
  { key: "orderSubmissionFailed", sr: "Slanje porudzbine nije uspelo.", en: "Order submission failed." },
  { key: "loadingOrderForm", sr: "Ucitavam formu za porudzbinu", en: "Loading order form" },
  { key: "orderReceived", sr: "Porudzbina primljena", en: "Order received" },
  { key: "orderNumber", sr: "Broj porudzbine", en: "Order number" },
  { key: "total", sr: "Ukupno", en: "Total" },
  { key: "voucherApplied", sr: "Primenjen vaucer", en: "Voucher applied" },
  { key: "continueShopping", sr: "Nastavi kupovinu", en: "Continue shopping" },
  { key: "contactUs", sr: "Kontaktiraj nas", en: "Contact us" },
  { key: "orderFormIsEmpty", sr: "Forma za porudzbinu je prazna", en: "Order form is empty" },
  { key: "addProductsToTheCartBeforeSendingTheOrde", sr: "Dodaj proizvode u korpu pre slanja porudzbine.", en: "Add products to the cart before sending the order." },
  { key: "goToWebShop", sr: "Idi na web shop", en: "Go to web shop" },
  { key: "step3", sr: "Korak 3", en: "Step 3" },
  { key: "sendTheOrderWithOnlyTheEssentialDetails", sr: "Posalji porudzbinu uz samo neophodne podatke.", en: "Send the order with only the essential details." },
  { key: "orderOverview", sr: "Pregled porudzbine", en: "Order overview" },
  { key: "items", sr: "Artikli", en: "Items" },
  { key: "products", sr: "Proizvodi", en: "Products" },
  { key: "delivery", sr: "Dostava", en: "Delivery" },
  { key: "free", sr: "Besplatno", en: "Free" },
  { key: "currentTotal", sr: "Trenutni ukupno", en: "Current total" },
  { key: "orderForm", sr: "Porudzbina", en: "Order form" },
  { key: "customerDetails", sr: "Podaci kupca", en: "Customer details" },
  { key: "backToCart", sr: "Nazad na korpu", en: "Back to cart" },
  { key: "requiredContact", sr: "Obavezni kontakt podaci", en: "Required contact" },
  { key: "fullName", sr: "Ime i prezime", en: "Full name" },
  { key: "firstAndLastName", sr: "Ime i prezime", en: "First and last name" },
  { key: "nameIsRequired", sr: "Ime je obavezno.", en: "Name is required." },
  { key: "phone", sr: "Telefon", en: "Phone" },
  { key: "mobileOrLandlineNumber", sr: "Mobilni ili fiksni broj", en: "Mobile or landline number" },
  { key: "phoneIsRequired", sr: "Telefon je obavezan.", en: "Phone is required." },
  { key: "enterAValidEmailAddress", sr: "Unesite ispravnu email adresu.", en: "Enter a valid email address." },
  { key: "deliveryOrPickup", sr: "Dostava ili preuzimanje", en: "Delivery or pickup" },
  { key: "option", sr: "Opcija", en: "Option" },
  { key: "pickupStore", sr: "Radnja za preuzimanje", en: "Pickup store" },
  { key: "deliveryService", sr: "Kurirska sluzba", en: "Delivery service" },
  { key: "optionalDeliveryDetails", sr: "Opcioni podaci za dostavu", en: "Optional delivery details" },
  { key: "address", sr: "Adresa", en: "Address" },
  { key: "optional", sr: "opciono", en: "optional" },
  { key: "streetAndNumber", sr: "Ulica i broj", en: "Street and number" },
  { key: "city", sr: "Grad", en: "City" },
  { key: "postalCode", sr: "Postanski broj", en: "Postal code" },
  { key: "noteForTheTeam", sr: "Napomena za tim", en: "Note for the team" },
  { key: "sizesPickupTimeDeliveryNote", sr: "Velicine, vreme preuzimanja, napomena za dostavu...", en: "Sizes, pickup time, delivery note..." },
  { key: "sending", sr: "Slanje...", en: "Sending..." },
  { key: "sendOrder", sr: "Posalji porudzbinu", en: "Send order" },
  { key: "editCart", sr: "Izmeni korpu", en: "Edit cart" },
  { key: "orderSummary", sr: "Pregled porudzbine", en: "Order summary" },
  { key: "everythingYouReSending", sr: "Sve sto upravo saljes.", en: "Everything you're sending." },
  { key: "size", sr: "Velicina", en: "Size" },
  { key: "material", sr: "Materijal", en: "Material" },
  { key: "voucherCode", sr: "Vaučer kod", en: "Voucher code" },
  { key: "enterVoucherCode", sr: "Unesi vaučer kod", en: "Enter voucher code" },
  { key: "apply", sr: "Primeni", en: "Apply" },
  { key: "discountApplied", sr: "Popust primenjen", en: "Discount applied" },
  { key: "subtotal", sr: "Međuzbir", en: "Subtotal" },
  { key: "voucherDiscount", sr: "Popust (vaučer)", en: "Voucher discount" },
  { key: "thankYouWeReceivedYourOrder", sr: "Hvala! Tvoja porudzbina je primljena.", en: "Thank you! We received your order." },
  { key: "ourTeamWillCallYouWithin2HoursMonSat0920", sr: "Nas tim ce te pozvati u roku od 2 sata (Pon-Sub, 09-20h) radi potvrde velicine, dostave i nacina placanja.", en: "Our team will call you within 2 hours (Mon-Sat, 09-20h) to confirm size, delivery and payment method." },
  { key: "tipSaveTheOrderNumberIfYouDonTHearFromUs", sr: "Savet: sacuvaj broj porudzbine. Ako se ne javimo u roku od 2 sata, slobodno nas pozovi.", en: "Tip: save the order number. If you don't hear from us within 2 hours, please contact us directly." },
  { key: "theSimplestRouteIsProductCartReviewThenT", sr: "Najjednostavniji put je proizvod, pregled korpe, pa tek onda forma za porudzbinu.", en: "The simplest route is product, cart review, then this order form." },
  { key: "enterYourContactDetailsAndIfYouLikeADeli", sr: "Unesi kontakt podatke i po zelji adresu ili napomenu. Placanje unapred nije potrebno.", en: "Enter your contact details and, if you like, a delivery address or note. No online payment is required upfront." },
  { key: "theseThreeFieldsAreEnoughForTheTeamToCon", sr: "Ova tri polja su dovoljna da tim brzo potvrdi porudzbinu.", en: "These three fields are enough for the team to confirm the order quickly." },
  { key: "youAreSignedInTheOrderIsLinkedToYourAcco", sr: "Ulogovan si. Porudzbina se vezuje za nalog kada email u formi odgovara prijavi.", en: "You are signed in. The order is linked to your account when the email matches your login." },
  { key: "addAddressDetailsNowOnlyIfYouAlreadyKnow", sr: "Dodaj podatke za dostavu sada samo ako ih vec znas.", en: "Add address details now only if you already know them." },
  { key: "useThisForSizeRemarksPickupPreferenceOrA", sr: "Ovde upisi napomenu o velicini, nacinu preuzimanja ili bilo sta sto tim treba da zna.", en: "Use this for size remarks, pickup preference or anything the team should know." },
  { key: "afterYouSendTheOrderOurTeamCallsYouToCon", sr: "Nakon slanja porudzbine nas tim te poziva da potvrdi dostupnost, dostavu i placanje.", en: "After you send the order, our team calls you to confirm availability, delivery and payment." },
  { key: "weAcceptCashOnDeliveryCardBankTransfer", sr: "Prihvatamo: placanje pouzecam, karticom, uplatnicom.", en: "We accept: cash on delivery, card, bank transfer." },
  { key: "paymentOnDeliveryByCardOrBankTransferYou", sr: "Placanje pouzecem, karticom ili uplatnicom — biras kada te nas tim pozove radi potvrde porudzbine.", en: "Payment on delivery, by card or bank transfer — you choose when our team calls to confirm the order." },
  { key: "freeDeliveryNudge", sr: "Dodaj jos {iznos} za besplatnu dostavu", en: "Add {iznos} more for free delivery" },
];

export type CheckoutCopyKey = (typeof CHECKOUT_COPY_FIELDS)[number]["key"];

/** What the admin stores: only the keys they actually changed, per language. */
export type CheckoutCopyOverrides = Record<string, { sr?: string; en?: string }>;

/** What the page renders: every key resolved for one language. */
export type CheckoutCopy = Record<string, string>;

const FIELD_KEYS = new Set(CHECKOUT_COPY_FIELDS.map((field) => field.key));

/** Drop unknown keys and blank strings so stale data cannot blank the page. */
export function normalizeCheckoutCopyOverrides(value: unknown): CheckoutCopyOverrides {
  if (!value || typeof value !== "object") return {};
  const out: CheckoutCopyOverrides = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!FIELD_KEYS.has(key) || !raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const sr = String(row.sr ?? "").trim();
    const en = String(row.en ?? "").trim();
    if (!sr && !en) continue;
    out[key] = { ...(sr ? { sr } : {}), ...(en ? { en } : {}) };
  }
  return out;
}

/** Defaults with the admin's overrides applied, for the language being served. */
export function resolveCheckoutCopy(
  overrides: CheckoutCopyOverrides | undefined,
  lang: "sr" | "en",
): CheckoutCopy {
  const copy: CheckoutCopy = {};
  for (const field of CHECKOUT_COPY_FIELDS) {
    const override = overrides?.[field.key];
    const custom = lang === "en" ? override?.en : override?.sr;
    copy[field.key] = (custom && custom.trim()) || (lang === "en" ? field.en : field.sr);
  }
  return copy;
}

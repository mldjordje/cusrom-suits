type DynamicCopyLanguage = "sr" | "en";

const normalize = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const EXACT_EN_MAP = new Map<string, string>([
  ["kolekcija", "Collection"],
  ["nova kolekcija", "New Collection"],
  ["web shop kolekcija spremna za porucivanje", "Web shop collection ready to order"],
  ["web shop kolekcija spremna za poručivanje", "Web shop collection ready to order"],
  ["kurirani izbor krojeva", "Curated tailoring selection"],
  ["izdvojeni modeli", "Featured Pieces"],
  ["popularni proizvodi", "Popular Products"],
  ["novi modeli", "New Arrivals"],
  ["aktuelne akcije", "Current Sale"],
  ["aktuelno sada", "Trending Now"],
  ["santos izbor", "Santos Selection"],
  ["brend prica", "Brand Story"],
  ["brend priča", "Brand Story"],
  ["o nama", "About"],
  ["kontakt", "Contact"],
  ["informacije za kupce", "Customer Information"],
  ["prava potrosaca i uputstvo za kupovinu", "Customer rights and purchase guide"],
  ["prava potrošača i uputstvo za kupovinu", "Customer rights and purchase guide"],
  ["podaci o firmi", "Company Details"],
  ["dokumenta za preuzimanje", "Download Documents"],
  ["ovde mozete dodati obrasce i dokumenta koja kupci mogu odmah da preuzmu.", "Here you can add forms and documents that customers can download right away."],
  ["dokumenta", "Documents"],
  ["najnoviji blog", "Latest Blog"],
  ["poslovne uniforme", "Business Uniforms"],
  ["brend nastao iz porodicne radionice", "A brand born from a family workshop"],
  ["brend nastao iz porodične radionice", "A brand born from a family workshop"],
  ["podrska i licne preporuke", "Support and Personal Recommendations"],
  ["podrška i lične preporuke", "Support and Personal Recommendations"],
  ["prava potrosaca", "Customer Rights"],
  ["prava potrošača", "Customer Rights"],
  ["kupac ima pravo na jasne informacije o proizvodu, ceni, nacinu porucivanja, isporuci i reklamaciji. santos & santorini postupa po vazecim propisima i reklamacije resava kroz direktnu komunikaciju sa kupcem.", "The customer has the right to clear information about the product, price, ordering method, delivery and complaints. Santos & Santorini follows applicable regulations and resolves complaints through direct communication with the customer."],
  ["kupac ima pravo na jasne informacije o proizvodu, ceni, načinu poručivanja, isporuci i reklamaciji. santos & santorini postupa po važećim propisima i reklamacije rešava kroz direktnu komunikaciju sa kupcem.", "The customer has the right to clear information about the product, price, ordering method, delivery and complaints. Santos & Santorini follows applicable regulations and resolves complaints through direct communication with the customer."],
  ["uputstvo za kupovinu", "Purchase Guide"],
  ["izaberite proizvod i velicinu, dodajte artikal u korpu, zatim na checkout strani unesite kontakt podatke i posaljite porudzbinu kao upit. nas tim potom potvrdjuje dostupnost, rok i sve detalje isporuke.", "Choose a product and size, add the item to the cart, then enter your contact details on checkout and submit the order as an inquiry. Our team then confirms availability, lead time and all delivery details."],
  ["izaberite proizvod i veličinu, dodajte artikal u korpu, zatim na checkout strani unesite kontakt podatke i pošaljite porudžbinu kao upit. naš tim potom potvrđuje dostupnost, rok i sve detalje isporuke.", "Choose a product and size, add the item to the cart, then enter your contact details on checkout and submit the order as an inquiry. Our team then confirms availability, lead time and all delivery details."],
  ["pogledaj sve", "View All"],
  ["pogledaj kolekciju", "View Collection"],
  ["pogledaj akcije", "View Sale"],
  ["kupi odmah", "Shop Now"],
  ["web shop", "Web Shop"],
  ["kontakt forma", "Contact Form"],
  ["pregledaj kolekciju uz citljiviju navigaciju, pretragu po proizvodu i filtere koji sada rade pregledno i na desktopu i na telefonu.", "Browse the collection with clearer navigation, product search and filters that now work cleanly on both desktop and mobile."],
  ["pregledaj kolekciju uz čitljiviju navigaciju, pretragu po proizvodu i filtere koji sada rade pregledno i na desktopu i na telefonu.", "Browse the collection with clearer navigation, product search and filters that now work cleanly on both desktop and mobile."],
  ["santos & santorini priprema poslovne uniforme prilagodjene identitetu brenda, delatnosti i potrebama tima. u ponudi su muske i zenske kombinacije, radne kecelje, mantili, kosulje i kompletne capsule kolekcije za kompanije.", "Santos & Santorini creates business uniforms tailored to the brand identity, industry and team needs. The offer includes men's and women's combinations, work aprons, coats, shirts and complete capsule collections for companies."],
  ["santos & santorini priprema poslovne uniforme prilagođene identitetu brenda, delatnosti i potrebama tima. u ponudi su muške i ženske kombinacije, radne kecelje, mantili, košulje i kompletne capsule kolekcije za kompanije.", "Santos & Santorini creates business uniforms tailored to the brand identity, industry and team needs. The offer includes men's and women's combinations, work aprons, coats, shirts and complete capsule collections for companies."],
  ["zenska uniforma mantil", "Women's Uniform Coat"],
  ["Ĺľenska uniforma mantil", "Women's Uniform Coat"],
  ["kosulja kratak rukav", "Short-Sleeve Shirt"],
  ["koĹˇulja kratak rukav", "Short-Sleeve Shirt"],
  ["pantalone i jakna", "Trousers and Jacket"],
  ["santos video prezentacija zenske poslovne uniforme", "Santos video presentation of women's business uniform"],
  ["santos video prezentacija Ĺľenske poslovne uniforme", "Santos video presentation of women's business uniform"],
  ["santos video prezentacija poslovne kosulje kratkog rukava", "Santos video presentation of a short-sleeve business shirt"],
  ["santos video prezentacija poslovne koĹˇulje kratkog rukava", "Santos video presentation of a short-sleeve business shirt"],
  ["santos video prezentacija kompleta pantalone i jakna", "Santos video presentation of the trousers and jacket set"],
]);

const TOKEN_EN_MAP = new Map<string, string>([
  ["odela", "suits"],
  ["odelo", "suit"],
  ["sakoi", "blazers"],
  ["sako", "blazer"],
  ["kosulje", "shirts"],
  ["kosulja", "shirt"],
  ["kosulj", "shirt"],
  ["pantalone", "trousers"],
  ["jakne", "jackets"],
  ["jakna", "jacket"],
  ["kaputi", "coats"],
  ["kaput", "coat"],
  ["dzemperi", "knitwear"],
  ["dzemper", "knitwear"],
  ["džemperi", "knitwear"],
  ["džemper", "knitwear"],
  ["kaisevi", "belts"],
  ["kais", "belt"],
  ["cipele", "shoes"],
  ["obuca", "footwear"],
  ["obuća", "footwear"],
  ["majice", "t-shirts"],
  ["majica", "t-shirt"],
  ["aksesoari", "accessories"],
  ["elegantna", "formal"],
  ["elegantni", "formal"],
  ["muska", "menswear"],
  ["muška", "menswear"],
  ["muske", "menswear"],
  ["muške", "menswear"],
  ["kolekcija", "collection"],
  ["izbor", "selection"],
  ["izdvojeni", "featured"],
  ["popularni", "popular"],
  ["novi", "new"],
  ["aktuelne", "current"],
  ["aktuelno", "current"],
  ["trendinzi", "trending"],
  ["trend", "trending"],
  ["brend", "brand"],
  ["prica", "story"],
  ["priča", "story"],
  ["informacije", "information"],
  ["kupce", "customers"],
  ["prava", "rights"],
  ["potrosaca", "customers"],
  ["potrošača", "customers"],
  ["uputstvo", "guide"],
  ["kupovinu", "purchase"],
  ["podaci", "details"],
  ["firmi", "company"],
  ["podrska", "support"],
  ["podrška", "support"],
  ["licne", "personal"],
  ["lične", "personal"],
  ["preporuke", "recommendations"],
  ["kurirani", "curated"],
  ["krojeva", "tailoring"],
  ["spremna", "ready"],
  ["porucivanje", "ordering"],
  ["poručivanje", "ordering"],
  ["poslovne", "business"],
  ["uniforme", "uniforms"],
  ["dokumenta", "documents"],
  ["preuzimanje", "download"],
  ["kontakt", "contact"],
  ["blog", "blog"],
]);

const titleCase = (value: string) =>
  value.replace(/\b([a-z])([a-z']*)/g, (_, first: string, rest: string) => `${first.toUpperCase()}${rest}`);

const translateByTokens = (value: string) => {
  let changed = false;
  const translated = value.replace(/[\p{L}]+/gu, (token) => {
    const mapped = TOKEN_EN_MAP.get(normalize(token));
    if (!mapped) return token;
    changed = true;
    return mapped;
  });
  return { value: translated, changed };
};

export const localizeDynamicStorefrontText = (
  value: string | null | undefined,
  lang: DynamicCopyLanguage,
  fallbackEn?: string,
) => {
  const raw = String(value || "").trim();
  if (!raw || lang !== "en") return raw;

  const exact = EXACT_EN_MAP.get(normalize(raw));
  if (exact) return exact;

  if (raw.length > 80) {
    return fallbackEn || raw;
  }

  const translated = translateByTokens(raw);
  if (translated.changed) {
    return titleCase(translated.value);
  }

  return fallbackEn || raw;
};

export const localizeDynamicCategoryLabel = (
  value: string | null | undefined,
  lang: DynamicCopyLanguage,
) => localizeDynamicStorefrontText(value, lang, lang === "en" ? "Collection" : String(value || ""));

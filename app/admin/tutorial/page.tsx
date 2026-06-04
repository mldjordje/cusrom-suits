import Link from "next/link";

const sections = [
  {
    title: "1. Osnovni tok rada",
    body: [
      "Prvo dodas ili izmenis proizvod u delu `Web Shop -> Proizvodi i lager`.",
      "Ako zelis da proizvod bude na snizenju, idi na `Web Shop -> Akcije i snizenja` i tamo menjaj akcijsku cenu ili popust.",
      "Ako zelis da proizvod bude na pocetnoj strani, idi na posebnu stranu `Pocetna i sekcije` i tamo biraj sekcije i proizvode.",
      "Za footer, prodajna mesta, kontakt stranu i ostale javne tekstove koristi `Site Content`.",
      "Za dostavu, preuzimanje i vaucere koristi `Fulfillment`.",
      "Broj `ukupno proizvoda` na admin dashboardu prikazuje sirov katalog, dok storefront i web shop listing koriste samo proizvode koji su `Aktivni` i `Export`.",
      "Na kraju proveri storefront i po potrebi prati porudzbine u `Porudzbine`.",
    ],
  },
  {
    title: "2. Proizvodi i lager",
    body: [
      "mOffice sync donosi sirove redove lagera. Web shop ne prikazuje sve redove: admin ih grupise, filtrira i prikazuje samo spremne artikle.",
      "U vrhu `Proizvodi i lager` gledaj kartice: `mOffice`, `mOffice skriveno`, `Spremno za objavu`, `Treba slika`, `Treba opis` i `Rucna cena`.",
      "Najvazniji red rada je: prvo dodaj slike, zatim opis/kategoriju, zatim objavi proizvod.",
      "`Aktivan` znaci da proizvod sme da se prikaze na sajtu.",
      "`Export` znaci da je ukljucen u sinhronizacije i spoljne tokove.",
      "`Prodajna cena` je cena koju kupac vidi na sajtu. `Regularna cena` je puna, precrtana cena.",
      "Ako je artikal iz mOffice-a, cena se normalno osvezava iz mOffice sync-a. Ako ukljucis `Pregazi mOffice cenu`, cena ostaje rucno uneta, a lager se i dalje osvezava.",
      "`Lager magacin 1` i `Ukupan lager` su kolicine. Ako je lager 0, proizvod moze ostati vidljiv ali bez trenutne dostupnosti.",
      "Kategorije sluze za filtriranje, organizaciju i potencijalna promo pravila po grupama proizvoda.",
      "Svaki artikal sada moze da ima i video klip. Dodajes ga u editoru proizvoda kroz URL ili `Upload video`, a posle obavezno kliknes `Sacuvaj`.",
      "Pocetna strana se vise ne podesava iz editora proizvoda. Za to postoji posebna strana `Pocetna i sekcije`.",
    ],
  },
  {
    title: "3. Akcije i snizenja",
    body: [
      "Postoje dva nacina rada.",
      "Prvi je direktno po proizvodu: uneses `Akcijsku cenu` ili `Popust %` i sacuvas red.",
      "Drugi je kroz `Automatska pravila`: na primer, popust za ceo brend, kategoriju ili odredjene proizvode.",
      "Ako koristis pravila, prioritet odredjuje koje pravilo ima prednost kada ih ima vise.",
      "Akcija i raspored na pocetnoj su odvojene stvari: snizenje se radi u ovom tabu, a home sekcije na posebnoj strani.",
    ],
  },
  {
    title: "4. Pocetna i sekcije",
    body: [
      "Pocetna strana se sada uredjuje na posebnoj strani `Pocetna i sekcije` odnosno `/admin/landing`.",
      "Tamo mozes da ukljucujes i iskljucujes sekcije, menjas redosled, biras proizvode unutar sekcije i dodajes nove custom produkt sekcije.",
      "Landing vise nije ogranicen samo na stare hardkodirane blokove: postoji raspored sekcija i svaka produkt sekcija ima sopstveni naslov, podnaslov i CTA.",
      "Custom sekcije imaju sopstvene proizvode, naslov, podnaslov i dugme, a hero, banneri, story kartice, dokumenta i ostali landing blokovi imaju poseban content editor.",
      "Ako zelis da menjas hero, bannere, story kartice, dokumenta, business uniforme ili ostale landing tekstove, koristi editor sadrzaja koji je povezan sa landing podesavanjima.",
      "Strana `Poslovne uniforme` sada podrzava i slike i video klipove, a tekst na toj stranici se i dalje menja kroz landing content editor.",
      "Ako neka produkt sekcija ostane prazna, storefront jos uvek moze da koristi fallback izbor iz kataloga, ali preporuka je da za home rucno kuriras ono sto zelis da se vidi.",
      "Promene nisu automatske. Posle izmene obavezno klikni `Sacuvaj sekcije` ili `Sacuvaj landing`, zavisno od bloka koji uredjujes.",
    ],
  },
  {
    title: "5. Porudzbine i checkout",
    body: [
      "Web shop korpa i checkout zavrsavaju u `Porudzbine`.",
      "Tu se vidi izvor porudzbine, artikli, kontakt podaci, cena i status.",
      "Trenutni checkout tok je bez online karticnog placanja. Kupac salje porudzbinu kao upit, a tim zatim potvrdjuje dostupnost i naredne korake.",
      "Preporuka je da status ide redom: `pending` -> `confirmed` -> `completed`, ili `cancelled` ako je potrebno.",
      "Ako kupac prijavi problem sa porudzbinom, prvo proveri da li su artikli bili aktivni i da li je lager bio smislen u trenutku kupovine.",
    ],
  },
  {
    title: "6. Site Content, dokumenta i pravne stranice",
    body: [
      "Strana `Site Content` sluzi za navigaciju, footer, prodajna mesta, about i kontakt sadrzaj.",
      "Kada uploadujes slike ili dokumenta kroz admin, novi fajlovi se sada cuvaju centralno tako da ostaju dostupni i na produkciji.",
      "Sekcija `Dokumenta` na javnom sajtu sada nije samo download lista, vec i ulazna tacka za pravne stranice.",
      "Pravne stranice koje moraju postojati i ostati azurne su: `Polisa privatnosti`, `Uslovi kupovine`, `Reklamacije`, `Isporuka`, `Uslovi koriscenja kolacica` i `Nacin placanja`.",
      "Ako menjas logoe, slike bannera ili dokumenta, proveri javni sajt odmah posle cuvanja da bi bio siguran da se novi asset stvarno povukao na produkciji.",
      "Ako menjas kontakt podatke firme, prodajna mesta ili copy u footeru, proveri i javni sajt posle cuvanja jer su to odmah vidljive promene.",
      "Na admin dashboardu postoji i `Vercel analytics overview` kao brzi pregled kljucnih signala i link ka punom analytics dashboardu.",
    ],
  },
  {
    title: "7. Fulfillment, dostava i vauceri",
    body: [
      "Strana `Fulfillment` kontrolise pickup/delivery tok, dostupne kurirske sluzbe i vaucere.",
      "Ako kupac vidi pogresnu dostavu ili se ne pojavljuje odgovarajuca kurirska sluzba, prvo proveri `Fulfillment`, a ne landing ili proizvod.",
      "Vaucere koristi pazljivo: kada se iskoriste, vezuju se za konkretnu porudzbinu.",
    ],
  },
  {
    title: "8. Ananas i integracije",
    body: [
      "Sve oko sinhronizacije i izvoza je u `Integracije`.",
      "Tu se prate runovi, retry logika i stanja za Ananas i lager tokove.",
      "Ako proizvod nije dobro pripremljen za integraciju, prvo proveri da li ima smislen SKU, aktivan status, export ukljucen i uredne osnovne podatke.",
      "Ako nesto ne ode na Ananas kako treba, ne popravljas to na landing-u ili u akcijama, nego u proizvodu i integracijama.",
    ],
  },
  {
    title: "9. Preporuceni dnevni checklist za strica",
    body: [
      "1. Otvori `Web Shop Hub -> Proizvodi i lager`.",
      "2. Klikni red rada `1. Dodaj slike`, zatim `Primeni filtere`. Otvori artikal, dodaj slike sa telefona, izaberi glavnu sliku i klikni `Sacuvaj`.",
      "3. Klikni red rada `2. Dodaj opis`, zatim `Primeni filtere`. Dodaj kratak opis, materijal/specifikaciju i proveri kategoriju.",
      "4. Klikni red rada `3. Objavi spremno`, zatim `Primeni filtere`. Proveri artikal i ukljuci `Aktivan` + `Export`.",
      "5. Ako cena iz mOffice-a nije dobra, ukljuci `Pregazi mOffice cenu`, unesi cenu i sacuvaj. Ovo koristi samo kad stvarno treba.",
      "6. Proveri `Akcije i snizenja` samo za popuste. Ne koristi akcije za obicnu korekciju pogresne cene.",
      "7. Ako treba da bude na pocetnoj, idi na `Pocetna i sekcije` i dodaj proizvod u odgovarajucu sekciju.",
      "8. Na kraju proveri javni proizvod preko dugmeta `Pregled` i proveri porudzbine.",
    ],
  },
];

const quickLinks = [
  { href: "/admin/webshop", label: "Web Shop Hub" },
  { href: "/admin/webshop?tab=products", label: "Proizvodi i lager" },
  { href: "/admin/webshop?tab=akcije", label: "Akcije i snizenja" },
  { href: "/admin/landing", label: "Pocetna i sekcije" },
  { href: "/admin/site-content", label: "Site Content" },
  { href: "/admin/fulfillment", label: "Fulfillment" },
  { href: "/admin/orders", label: "Porudzbine" },
  { href: "/admin/integrations", label: "Integracije / Ananas" },
  { href: "/admin/categories", label: "Kategorije" },
];

const launchChecklist = [
  "Proveri build i produkcione env varijable.",
  "Potvrdi sveze katalog podatke u Supabase.",
  "Ako koristimo legacy asset host, proveri da je `LEGACY_ASSET_ORIGIN` postavljen na produkciji.",
  "Prodji redirecte iz stare strukture sajta i pravne URL-ove.",
  "Proveri home, listing, product detail, checkout, kontakt i newsletter tok.",
  "Proveri landing sekcije, dokumenta, pravne stranice i prodajna mesta.",
  "Proveri admin tok za porudzbine, kontakt poruke, site content i fulfillment.",
];

export default function AdminTutorialPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tutorial</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Kako radi web shop admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          Jedno mesto za objasnjenje proizvoda, lagera, akcija, pocetne strane, javnog sadrzaja, porudzbina i integracija.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {section.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">10. Launch checklist za glavni domen</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {launchChecklist.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              Detaljniji checklist je u fajlu{" "}
              <code>docs/main-domain-launch-checklist.md</code>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

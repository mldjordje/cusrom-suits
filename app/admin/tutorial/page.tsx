import Link from "next/link";

const sections = [
  {
    title: "1. Osnovni tok rada",
    body: [
      "Prvo dodas ili izmenis proizvod u delu `Web Shop -> Proizvodi i lager`.",
      "Ako zelis da proizvod bude na snizenju, idi na `Web Shop -> Akcije i snizenja` i tamo menjaj akcijsku cenu ili popust.",
      "Ako zelis da proizvod bude na pocetnoj strani, idi na `Web Shop -> Pocetna i sekcije` i izaberi ga u konkretnoj sekciji.",
      "Na kraju proveri storefront i po potrebi prati porudzbine u `Porudzbine`.",
    ],
  },
  {
    title: "2. Proizvodi i lager",
    body: [
      "`Aktivan` znaci da proizvod sme da se prikaze na sajtu.",
      "`Export` znaci da je ukljucen u sinhronizacije i spoljne tokove.",
      "`Prodajna cena` je cena koju kupac vidi na sajtu. `Regularna cena` je puna, precrtana cena.",
      "`Lager magacin 1` i `Ukupan lager` su kolicine. Ako je lager 0, proizvod moze ostati vidljiv ali bez trenutne dostupnosti.",
      "Kategorije sluze za filtriranje, organizaciju i potencijalna promo pravila po grupama proizvoda.",
      "Pocetna strana se vise ne podesava iz editora proizvoda. Za to postoji poseban tab `Pocetna i sekcije`.",
    ],
  },
  {
    title: "3. Akcije i snizenja",
    body: [
      "Postoje dva nacina rada.",
      "Prvi je direktno po proizvodu: uneses `Akcijsku cenu` ili `Popust %` i sacuvas red.",
      "Drugi je kroz `Automatska pravila`: na primer, popust za ceo brend, kategoriju ili odredjene proizvode.",
      "Ako koristis pravila, prioritet odredjuje koje pravilo ima prednost kada ih ima vise.",
      "Akcija i raspored na pocetnoj su odvojene stvari: snizenje se radi u ovom tabu, a home sekcije u posebnom tabu.",
    ],
  },
  {
    title: "4. Pocetna i sekcije",
    body: [
      "Pocetna strana se uredjuje na jednom mestu: `Web Shop -> Pocetna i sekcije`.",
      "Svaka sekcija ima svoju listu proizvoda: hero traka, izdvojeni modeli, popularno, nova kolekcija, trendinzi i akcije na pocetnoj.",
      "Preporuceni nacin rada je da proizvode za home biras iskljucivo u tim sekcijama, a ne kroz edit samog proizvoda.",
      "Na vrhu strane postoji kratak pregled svih sekcija sa brojem dodatih proizvoda.",
      "Ako neka sekcija ostane prazna, storefront koristi rezervni fallback prikaz.",
      "Promene nisu automatske. Posle izmene obavezno klikni `Sacuvaj landing`.",
    ],
  },
  {
    title: "5. Porudzbine i checkout",
    body: [
      "Web shop korpa i checkout zavrsavaju u `Porudzbine`.",
      "Tu se vidi izvor porudzbine, artikli, kontakt podaci, cena i status.",
      "Preporuka je da status ide redom: `pending` -> `confirmed` -> `completed`, ili `cancelled` ako je potrebno.",
      "Ako kupac prijavi problem sa porudzbinom, prvo proveri da li su artikli bili aktivni i da li je lager bio smislen u trenutku kupovine.",
    ],
  },
  {
    title: "6. Ananas i integracije",
    body: [
      "Sve oko sinhronizacije i izvoza je u `Integracije`.",
      "Tu se prate runovi, retry logika i stanja za Ananas i lager tokove.",
      "Ako proizvod nije dobro pripremljen za integraciju, prvo proveri da li ima smislen SKU, aktivan status, export ukljucen i uredne osnovne podatke.",
      "Ako nesto ne ode na Ananas kako treba, ne popravljas to na landing-u ili u akcijama, nego u proizvodu i integracijama.",
    ],
  },
  {
    title: "7. Preporuceni dnevni checklist",
    body: [
      "Dodaj ili izmeni proizvod i lager.",
      "Ako treba, podesi akcijsku cenu ili promo pravilo.",
      "Ako treba da bude na home, dodaj ga u odgovarajucu sekciju pocetne.",
      "Proveri porudzbine, kontakt poruke i newsletter prijave.",
      "Po potrebi proveri `Integracije` ako ima sync problema.",
    ],
  },
];

const quickLinks = [
  { href: "/admin/webshop", label: "Web Shop Hub" },
  { href: "/admin/webshop?tab=products", label: "Proizvodi i lager" },
  { href: "/admin/webshop?tab=akcije", label: "Akcije i snizenja" },
  { href: "/admin/webshop?tab=landing", label: "Pocetna i sekcije" },
  { href: "/admin/orders", label: "Porudzbine" },
  { href: "/admin/integrations", label: "Integracije / Ananas" },
  { href: "/admin/categories", label: "Kategorije" },
];

export default function AdminTutorialPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tutorial</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Kako radi web shop admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          Jedno mesto za objasnjenje proizvoda, lagera, akcija, pocetne strane, porudzbina i Ananas/integracija.
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
      </div>
    </div>
  );
}

// SEO copy for web-shop category views, keyed by the normalized category group
// key (see normalizeCatalogCategoryGroupKey in lib/catalog/store.ts). Rendered as
// a descriptive block below the product grid — the standard e-commerce pattern
// that gives each category URL unique, crawlable body text.
//
// Text supplied by the client (Serbian only). Order here is the display order
// used on the default "all products" view.

export type CategorySeoEntry = {
  key: string;
  title: string;
  body: string;
};

export const CATEGORY_SEO_COPY: CategorySeoEntry[] = [
  {
    key: "odelo",
    title: "Odela",
    body:
      "Dobro odelo nije samo komad garderobe – ono ostavlja prvi utisak. U našoj ponudi nalaze se muška odela koja spajaju kvalitetnu izradu, pažljivo odabrane materijale i moderan kroj. Bilo da vam je potrebno odelo za venčanje, poslovni sastanak, maturu ili neku drugu svečanu priliku, ovde ćete pronaći model koji će odgovarati vašem stilu. Klasične i moderne boje, različiti krojevi i vrhunska završna obrada omogućavaju da svako pronađe odelo koje mu savršeno pristaje.",
  },
  {
    key: "sako",
    title: "Sakoi",
    body:
      "Muški sako je pravi izbor kada želite elegantan izgled bez potrebe da nosite kompletno odelo. Naša kolekcija obuhvata klasične, poslovne i casual modele koji se lako kombinuju uz pantalone, farmerke ili košulje. Kvalitetni materijali, precizan kroj i pažnja posvećena svakom detalju čine naše sakoe odličnim izborom za različite prilike – od svakodnevnog poslovnog stila do svečanih događaja.",
  },
  {
    key: "pantalone",
    title: "Pantalone",
    body:
      "Prave pantalone mogu u potpunosti promeniti izgled odevne kombinacije. U ponudi se nalaze elegantne muške pantalone koje pružaju udobnost tokom celog dana i lako se uklapaju uz košulje, sakoe i cipele. Zahvaljujući kvalitetnim materijalima i modernim krojevima, predstavljaju odličan izbor kako za poslovne prilike, tako i za svakodnevno nošenje.",
  },
  {
    key: "kosulja",
    title: "Košulje",
    body:
      "Muška košulja je nezaobilazan deo garderobe svakog muškarca. U našoj ponudi pronaći ćete modele za poslovne prilike, svečane događaje i svakodnevni stil. Od klasičnih jednobojnih košulja do modernih dezena, svaki model izrađen je od kvalitetnih materijala koji pružaju udobnost i besprekoran izgled. Lako se kombinuju uz odela, sakoe i pantalone, zbog čega su pravi izbor za svaku priliku.",
  },
  {
    key: "kaput",
    title: "Kaputi",
    body:
      "Kada temperature padnu, kvalitetan kaput postaje nezaobilazan deo garderobe. Naša kolekcija muških kaputa osmišljena je za muškarce koji žele da zadrže elegantan izgled i tokom hladnijih dana. Klasični krojevi, pažljivo odabrani materijali i bezvremenski dizajn čine ih idealnim izborom za poslovne i svečane prilike, ali i za svakodnevno nošenje.",
  },
  {
    key: "jakna",
    title: "Jakne",
    body:
      "Muške jakne iz naše ponude kombinuju funkcionalnost, udobnost i moderan dizajn. Bilo da tražite laganu jaknu za prelazni period ili topliji model za zimu, pronaći ćete kvalitetne modele koji će upotpuniti svaki stil. Jednostavne su za kombinovanje i pružaju udobnost tokom celog dana, bez odricanja od elegancije.",
  },
  {
    key: "aksesoari",
    title: "Aksesoari",
    body:
      "Detalji prave razliku. Zato smo u ponudu uvrstili pažljivo odabrane muške aksesoare koji upotpunjuju svaki stil. Kravate, leptir-mašne, kaiševi, novčanici, maramice za sako i drugi modni dodaci predstavljaju završni detalj svake elegantne kombinacije. Kvalitetna izrada i bezvremenski dizajn čine ih odličnim izborom za poslovne i svečane prilike.",
  },
  {
    key: "obuca",
    title: "Cipele",
    body:
      "Elegantne muške cipele predstavljaju osnovu svakog dobrog stila. Naša kolekcija obuhvata modele koji pružaju spoj udobnosti, kvaliteta i modernog izgleda. Bez obzira da li birate cipele za odelo, poslovni sastanak ili posebnu priliku, pronaći ćete model koji će se savršeno uklopiti uz ostatak garderobe i pružiti sigurnost pri svakom koraku.",
  },
  {
    key: "prsluk",
    title: "Prsluci",
    body:
      "Muški prsluk je detalj koji svakom odelu daje dodatnu dozu elegancije. Može se nositi kao deo trodelnog odela ili u kombinaciji sa košuljom i pantalonama za nešto opušteniji, ali i dalje sofisticiran izgled. Naši prsluci izrađeni su od kvalitetnih materijala, sa krojevima koji lepo prate liniju tela i pružaju maksimalnu udobnost tokom nošenja.",
  },
];

export const CATEGORY_SEO_BY_KEY: Record<string, CategorySeoEntry> = Object.fromEntries(
  CATEGORY_SEO_COPY.map((entry) => [entry.key, entry]),
);

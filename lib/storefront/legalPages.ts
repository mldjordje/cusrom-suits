export type LegalPageSlug =
  | "polisa_privatnosti"
  | "uslovi_kupovine"
  | "reklamacije"
  | "isporuka"
  | "uslovi_koriscenja_kolacica"
  | "nacinplacanja";

export type LegalPageSection = {
  title: string;
  titleEn: string;
  paragraphs: string[];
  paragraphsEn: string[];
};

export type LegalPageDefinition = {
  slug: LegalPageSlug;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  eyebrow: string;
  eyebrowEn: string;
  intro: string;
  introEn: string;
  sections: LegalPageSection[];
};

export const LEGAL_PAGE_ALIASES: Record<string, LegalPageSlug> = {
  "nacin-placanja": "nacinplacanja",
  nacin_placanja: "nacinplacanja",
  dostava: "isporuka",
  "zamena-i-povrat": "reklamacije",
  "politika-privatnosti": "polisa_privatnosti",
  "uslovi-kupovine": "uslovi_kupovine",
  "politika-kolacica": "uslovi_koriscenja_kolacica",
};

export const LEGAL_PAGES: Record<LegalPageSlug, LegalPageDefinition> = {
  polisa_privatnosti: {
    slug: "polisa_privatnosti",
    title: "Polisa privatnosti",
    titleEn: "Privacy policy",
    description:
      "Informacije o tome koje podatke prikupljamo, kako ih koristimo i kako kupac moze da ostvari svoja prava.",
    descriptionEn:
      "Information about the data we collect, how we use it and how customers can exercise their rights.",
    eyebrow: "Pravna dokumentacija",
    eyebrowEn: "Legal information",
    intro:
      "Ova stranica objasnjava koje podatke Santos & Santorini koristi tokom komunikacije, obrade porudzbina i rada sajta, kao i na koji nacin korisnik moze da trazi ispravku, uvid ili brisanje podataka kada je to dozvoljeno zakonom.",
    introEn:
      "This page explains which data Santos & Santorini uses during communication, order processing and website operation, and how a customer can request access, correction or deletion where permitted by law.",
    sections: [
      {
        title: "Koje podatke obradjujemo",
        titleEn: "What data we process",
        paragraphs: [
          "Obradjuju se podaci koje kupac sam dostavi kroz checkout, kontakt formu ili direktnu komunikaciju: ime i prezime, email adresa, broj telefona, adresa za isporuku, izabrani proizvodi, napomena uz porudzbinu i podaci o zeljenoj isporuci ili preuzimanju.",
          "Tokom rada sajta mogu se obradjivati i tehnicki podaci neophodni za bezbednost i osnovnu funkcionalnost, kao sto su sesija, tip uredjaja, jezik i osnovni log zapisi potrebni za dijagnostiku problema.",
        ],
        paragraphsEn: [
          "We process data that the customer submits through checkout, the contact form or direct communication: full name, email address, phone number, delivery address, selected products, order note and chosen delivery or pickup details.",
          "The website may also process technical data required for security and basic functionality, such as session information, device type, language and basic logs needed for troubleshooting.",
        ],
      },
      {
        title: "Svrha obrade",
        titleEn: "Purpose of processing",
        paragraphs: [
          "Podaci se koriste kako bi se obradila porudzbina kao upit, proverila dostupnost artikala, organizovala isporuka ili preuzimanje, odgovorilo na reklamaciju i odrzala komunikacija sa kupcem.",
          "Podaci se ne koriste za prikriveno profilisanje. Newsletter prijava je zaseban izbor korisnika i moze se u svakom trenutku opozvati.",
        ],
        paragraphsEn: [
          "Data is used to process the order inquiry, verify product availability, arrange delivery or pickup, respond to complaints and maintain customer communication.",
          "Data is not used for hidden profiling. Newsletter signup is a separate user choice and can be withdrawn at any time.",
        ],
      },
      {
        title: "Cuvanje i prava korisnika",
        titleEn: "Retention and user rights",
        paragraphs: [
          "Podaci se cuvaju onoliko dugo koliko je potrebno radi realizacije porudzbine, zakonskih obaveza, evidencije komunikacije i zastite legitimnih poslovnih interesa.",
          "Korisnik moze da zatrazi uvid, ispravku ili dopunu svojih podataka, kao i dodatne informacije o obradi, slanjem upita na kontakt email ili kroz kontakt stranicu.",
        ],
        paragraphsEn: [
          "Data is retained only as long as necessary for order handling, legal obligations, communication records and protection of legitimate business interests.",
          "A customer may request access, correction or completion of their data, as well as additional information about processing, by contacting us via email or the contact page.",
        ],
      },
    ],
  },
  uslovi_kupovine: {
    slug: "uslovi_kupovine",
    title: "Uslovi kupovine",
    titleEn: "Purchase terms",
    description:
      "Osnovna pravila za porucivanje, potvrdu dostupnosti, formiranje cene i komunikaciju sa kupcem.",
    descriptionEn:
      "Core rules for ordering, stock confirmation, price display and communication with the customer.",
    eyebrow: "Kupovina i porucivanje",
    eyebrowEn: "Ordering and purchase",
    intro:
      "Web shop trenutno radi kao jasan i pojednostavljen tok porucivanja bez online karticnog placanja. Kupac bira artikal, salje zahtev i dobija potvrdu dostupnosti i daljih koraka od tima Santos & Santorini.",
    introEn:
      "The web shop currently works as a streamlined ordering flow without online card payment. The customer selects products, sends a request and receives stock confirmation and next steps from the Santos & Santorini team.",
    sections: [
      {
        title: "Porudzbina kao upit",
        titleEn: "Order submitted as an inquiry",
        paragraphs: [
          "Slanjem checkout forme kupac salje zahtev za izabrane artikle. Porudzbina se belezi u sistemu, a tim potom proverava dostupnost, velicine, nacin isporuke i sve eventualne dodatne detalje.",
          "Dok se porudzbina ne potvrdi, dostupnost artikla, rok isporuke i konacni detalji realizacije zavise od stanja lagera i operativne potvrde prodajnog tima.",
        ],
        paragraphsEn: [
          "Submitting the checkout form sends an inquiry for the selected items. The order is recorded in the system and the team then checks stock, sizes, delivery method and any additional details.",
          "Until the order is confirmed, product availability, delivery timing and final fulfillment details depend on live inventory and an operational confirmation from the sales team.",
        ],
      },
      {
        title: "Cene i dostupnost",
        titleEn: "Prices and availability",
        paragraphs: [
          "Cene prikazane na sajtu predstavljaju maloprodajne cene za prikazane artikle, dok se akcijske cene i popusti obracunavaju prema trenutno vazecim pravilima i oznakama na sajtu.",
          "U slucaju tehnicke greske, netacne cene ili zastarelog stanja lagera, kupac ce biti odmah obavesten pre nego sto se porudzbina finalizuje.",
        ],
        paragraphsEn: [
          "Prices shown on the website represent retail prices for the displayed items, while sale pricing and discounts follow the currently active rules and labels shown on the website.",
          "In case of a technical error, incorrect price or outdated stock information, the customer will be notified before the order is finalized.",
        ],
      },
      {
        title: "Komunikacija i korisnicka podrska",
        titleEn: "Communication and support",
        paragraphs: [
          "Kupac je duzan da unese tacne kontakt podatke kako bi tim mogao da potvrdi porudzbinu i organizuje isporuku ili preuzimanje.",
          "Za pomoc oko izbora velicine, materijala, dostupnosti ili statusa porudzbine koristi se kontakt stranica, telefon ili email navedeni na sajtu.",
        ],
        paragraphsEn: [
          "The customer is expected to provide accurate contact information so the team can confirm the order and arrange delivery or pickup.",
          "For help with sizing, materials, availability or order status, customers can use the contact page, phone number or email listed on the website.",
        ],
      },
    ],
  },
  reklamacije: {
    slug: "reklamacije",
    title: "Reklamacije",
    titleEn: "Complaints and returns",
    description:
      "Nacin prijave reklamacije, potrebne informacije i tok resavanja zahteva nakon prijema prijave.",
    descriptionEn:
      "How to submit a complaint, which information is needed and how the request is processed after submission.",
    eyebrow: "Podrska posle kupovine",
    eyebrowEn: "After-purchase support",
    intro:
      "Ako kupac smatra da proizvod ima nedostatak ili zeli da prijavi problem sa isporukom ili porudzbinom, reklamacija se podnosi pisanim putem uz dovoljno informacija da tim moze brzo da proveri slucaj.",
    introEn:
      "If a customer believes the product has a defect or wants to report an issue with delivery or the order, the complaint should be submitted in writing with enough information for the team to review the case quickly.",
    sections: [
      {
        title: "Kako se podnosi reklamacija",
        titleEn: "How to submit a complaint",
        paragraphs: [
          "Reklamacija se moze poslati putem kontakt forme, emaila ili uz prilaganje reklamacionog obrasca iz sekcije Dokumenta. Potrebno je navesti ime kupca, kontakt, broj ili opis porudzbine, opis problema i po mogucstvu fotografije.",
          "Ako je problem vezan za odredjeni artikal, preporucuje se da se navede sifra ili naziv proizvoda, velicina i datum prijema posiljke ili preuzimanja.",
        ],
        paragraphsEn: [
          "A complaint can be submitted through the contact form, by email or together with the complaint form available in the Documents section. The customer should provide their name, contact details, order number or description, a description of the issue and, if possible, photos.",
          "If the issue concerns a specific item, it is recommended to include the product code or name, size and the date of delivery or pickup.",
        ],
      },
      {
        title: "Obrada zahteva",
        titleEn: "Request handling",
        paragraphs: [
          "Po prijemu reklamacije tim evidentira zahtev, pregleda dostavljene informacije i kontaktira kupca radi potvrde sledecih koraka ako je potrebno dodatno pojasnjenje ili pregled proizvoda.",
          "Resavanje reklamacije sprovodi se u razumnom roku i u skladu sa vazecim propisima, prirodom proizvoda i stanjem konkretnog zahteva.",
        ],
        paragraphsEn: [
          "After receiving the complaint, the team records the request, reviews the submitted information and contacts the customer if additional clarification or a product inspection is needed.",
          "Complaint resolution is handled within a reasonable timeframe and in line with applicable regulations, the nature of the product and the specifics of the request.",
        ],
      },
      {
        title: "Dokumentacija i kontakt",
        titleEn: "Documentation and contact",
        paragraphs: [
          "Kupac moze da koristi reklamacioni list iz sekcije Dokumenta, ali prijava nije ogranicena samo na taj format ako su svi kljucni podaci jasno navedeni.",
          "Za hitne situacije ili dodatne informacije, preporuka je da se nakon slanja zahteva kupac javi i telefonom kako bi tim mogao brze da reaguje.",
        ],
        paragraphsEn: [
          "Customers can use the complaint form available in the Documents section, but the request is not limited to that format as long as all key information is clearly provided.",
          "For urgent cases or additional context, it is recommended to also call after sending the request so the team can respond faster.",
        ],
      },
    ],
  },
  isporuka: {
    slug: "isporuka",
    title: "Isporuka",
    titleEn: "Delivery",
    description:
      "Informacije o kurirskoj isporuci, preuzimanju u radnji i nacinu potvrde roka isporuke.",
    descriptionEn:
      "Information about courier delivery, in-store pickup and how delivery timing is confirmed.",
    eyebrow: "Isporuka i preuzimanje",
    eyebrowEn: "Delivery and pickup",
    intro:
      "Novi web shop omogucava kupcu da izabere isporuku ili preuzimanje u radnji, a tim nakon prijema zahteva potvrdi raspolozivost artikala i najbrzi moguci nacin realizacije.",
    introEn:
      "The new web shop allows customers to choose delivery or in-store pickup, and the team confirms stock availability and the fastest possible fulfillment option after receiving the request.",
    sections: [
      {
        title: "Kurirska isporuka",
        titleEn: "Courier delivery",
        paragraphs: [
          "Ako je za porudzbinu izabrana dostava, kupac u checkout-u bira dostupnu kurirsku sluzbu. Cena dostave i osnovna pravila dostave prikazuju se tokom checkout procesa.",
          "Tacan rok isporuke zavisi od potvrde raspolozivosti artikla, odabrane kurirske sluzbe, destinacije i trenutnog operativnog opterecenja.",
        ],
        paragraphsEn: [
          "If delivery is selected, the customer chooses from the available courier services during checkout. Delivery cost and basic delivery rules are shown during the checkout flow.",
          "The exact delivery timeframe depends on stock confirmation, the selected courier, destination and current operational load.",
        ],
      },
      {
        title: "Preuzimanje u radnji",
        titleEn: "Store pickup",
        paragraphs: [
          "Kupac moze da izabere i preuzimanje u prodajnom mestu. Nakon sto tim potvrdi da je porudzbina spremna, kupac dobija informaciju o lokaciji i daljim koracima za preuzimanje.",
          "Pre dolaska preporucuje se da kupac saceka potvrdu tima kako bi se izbegla situacija da artikal jos nije pripremljen ili prebacen u izabranu radnju.",
        ],
        paragraphsEn: [
          "Customers may also select store pickup. Once the team confirms that the order is ready, the customer receives the location details and next pickup steps.",
          "Before visiting the store, the customer should wait for the team confirmation to avoid situations where the item has not yet been prepared or moved to the selected location.",
        ],
      },
      {
        title: "Napomena o dostupnosti",
        titleEn: "Availability note",
        paragraphs: [
          "Neke porudzbine zahtevaju dodatnu proveru velicine, boje, serije ili stanja u drugom prodajnom mestu. Zato se rok isporuke ili preuzimanja uvek smatra potvrdjenim tek nakon povratne informacije tima.",
        ],
        paragraphsEn: [
          "Some orders require an additional check of size, color, batch or stock in another store. For that reason, the delivery or pickup timing is considered confirmed only after the team sends a follow-up confirmation.",
        ],
      },
    ],
  },
  uslovi_koriscenja_kolacica: {
    slug: "uslovi_koriscenja_kolacica",
    title: "Uslovi koriscenja kolacica",
    titleEn: "Cookie policy",
    description:
      "Objasnjenje osnovnih kolacica i lokalnih podataka koje sajt koristi za rad, bezbednost i bolje korisnicko iskustvo.",
    descriptionEn:
      "An explanation of the basic cookies and local data the website uses for operation, security and a better user experience.",
    eyebrow: "Kolacici i privatnost",
    eyebrowEn: "Cookies and privacy",
    intro:
      "Ova stranica objasnjava upotrebu kolacica i slicnih lokalnih zapisa na sajtu. Nastavkom koriscenja sajta korisnik prihvata neophodnu upotrebu tehnickih kolacica koji omogucavaju osnovne funkcije sajta.",
    introEn:
      "This page explains the use of cookies and similar local storage on the website. By continuing to use the website, the user accepts the necessary technical cookies required for core functionality.",
    sections: [
      {
        title: "Sta su kolacici",
        titleEn: "What cookies are",
        paragraphs: [
          "Kolacici su male tekstualne datoteke koje browser cuva na uredjaju korisnika kako bi sajt mogao da zapamti osnovna podesavanja, sesiju, odabrani jezik i druge informacije bitne za pravilan rad.",
        ],
        paragraphsEn: [
          "Cookies are small text files stored by the browser on the user's device so the website can remember core settings, session state, selected language and other information needed for proper operation.",
        ],
      },
      {
        title: "Kako ih koristimo",
        titleEn: "How we use them",
        paragraphs: [
          "Sajt koristi neophodne kolacice i lokalne podatke za funkcionisanje korpe, admin sesije, bezbednosne provere, cuvanje osnovnih korisnickih izbora i odrzavanje stabilnog rada formulara i jezickih postavki.",
          "Ako se naknadno uvedu dodatni alati za analitiku ili oglasavanje, njihova upotreba treba da bude jasno navedena kroz azuriranu politiku i odgovarajuci pristanak kada je to potrebno.",
        ],
        paragraphsEn: [
          "The website uses necessary cookies and local data for cart functionality, admin sessions, security checks, storing basic user choices and keeping forms and language settings stable.",
          "If additional analytics or advertising tools are introduced later, their use should be disclosed through an updated policy and the appropriate consent flow where required.",
        ],
      },
      {
        title: "Kontrola i brisanje",
        titleEn: "Control and deletion",
        paragraphs: [
          "Korisnik moze da obrise ili blokira kolacice kroz podesavanja browser-a, ali to moze uticati na rad korpe, login sesije, jezicka podesavanja i druge kljucne delove sajta.",
        ],
        paragraphsEn: [
          "Users can delete or block cookies through browser settings, but this may affect the cart, login sessions, language settings and other core parts of the website.",
        ],
      },
    ],
  },
  nacinplacanja: {
    slug: "nacinplacanja",
    title: "Nacin placanja",
    titleEn: "Payment method",
    description:
      "Objasnjenje trenutnog nacina placanja i potvrde porudzbina dok online karticno placanje nije ukljuceno.",
    descriptionEn:
      "An explanation of the current payment flow while online card payments are not enabled.",
    eyebrow: "Placanje i potvrda porudzbine",
    eyebrowEn: "Payment and order confirmation",
    intro:
      "Online karticno placanje trenutno nije ukljuceno u ovom checkout toku. Kupac salje porudzbinu kao upit, a tim nakon potvrde dostupnosti daje jasne informacije o narednim koracima za realizaciju i placanje.",
    introEn:
      "Online card payment is not currently enabled in this checkout flow. The customer submits the order as an inquiry and, after stock confirmation, the team provides clear next steps for fulfillment and payment.",
    sections: [
      {
        title: "Trenutni tok",
        titleEn: "Current flow",
        paragraphs: [
          "Checkout na sajtu sluzi za brzo slanje zahteva sa kontakt podacima, izabranim artiklima i nacinom preuzimanja ili dostave. Nakon toga tim proverava stanje i kontaktira kupca radi potvrde.",
        ],
        paragraphsEn: [
          "Checkout is designed for quickly sending a request with contact details, selected products and the preferred delivery or pickup method. The team then verifies stock and contacts the customer for confirmation.",
        ],
      },
      {
        title: "Placanje posle potvrde",
        titleEn: "Payment after confirmation",
        paragraphs: [
          "Nakon sto porudzbina bude potvrdjena, kupac dobija preciznu informaciju o sledecem koraku. Time se izbegava situacija da korisnik plati artikal koji vise nije dostupan ili zahteva dodatnu proveru.",
        ],
        paragraphsEn: [
          "After the order is confirmed, the customer receives clear information about the next step. This avoids situations where a user would pay for an item that is no longer available or needs an additional check.",
        ],
      },
      {
        title: "Zasto je ovako postavljeno",
        titleEn: "Why the flow is set up this way",
        paragraphs: [
          "Ovakav tok je trenutno najbezbedniji za prelaz na novi sajt jer kupac i dalje brzo zavrsava porudzbinu, a prodajni tim zadrzava kontrolu nad dostupnoscu, velicinama, dostavom i operativnom potvrdom pre finalne realizacije.",
        ],
        paragraphsEn: [
          "This setup is currently the safest way to run the new website because the customer can still complete the order quickly while the sales team keeps control over availability, sizing, delivery and operational confirmation before final fulfillment.",
        ],
      },
    ],
  },
};

export const LEGAL_PAGE_ORDER: LegalPageSlug[] = [
  "polisa_privatnosti",
  "uslovi_kupovine",
  "reklamacije",
  "isporuka",
  "uslovi_koriscenja_kolacica",
  "nacinplacanja",
];

export function getLegalPageBySlug(slug: string): LegalPageDefinition | null {
  const normalized = String(slug || "").trim().toLowerCase();
  if (normalized in LEGAL_PAGES) {
    return LEGAL_PAGES[normalized as LegalPageSlug];
  }
  const aliased = LEGAL_PAGE_ALIASES[normalized];
  return aliased ? LEGAL_PAGES[aliased] : null;
}

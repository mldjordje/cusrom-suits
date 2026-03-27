export type StoreLocation = {
  slug: string;
  city: string;
  title: string;
  address: string;
  mapLabel: string;
  phone: string;
  landline?: string;
  email: string;
  hours: string[];
  mapEmbedUrl: string;
};

export type CompanyDocumentLink = {
  title: string;
  description: string;
  url: string;
};

export const STORE_LOCATIONS: StoreLocation[] = [
  {
    slug: "nis",
    city: "Nis",
    title: "Santos & Santorini Nis",
    address: "Obrenoviceva 9, 18000 Nis, Srbija",
    mapLabel: "Obrenoviceva 9 Nis, Srbija",
    phone: "+381 69 445 5106",
    landline: "+381 18 514 276",
    email: "santos.pobedina@gmail.com",
    hours: ["Pon-Pet: 09:00 - 21:00", "Subota: 09:00 - 20:00", "Nedelja: 10:00 - 17:00"],
    mapEmbedUrl: "https://www.google.com/maps?q=43.3201002,21.9037988&z=15&output=embed",
  },
  {
    slug: "krusevac",
    city: "Krusevac",
    title: "Santos & Santorini Krusevac",
    address: "Trg Fontana 16, Krusevac, Srbija",
    mapLabel: "Trg Fontana 16 Krusevac, Srbija",
    phone: "+381 69 44 55 104",
    landline: "+381 37 443 960",
    email: "santos.krusevac@gmail.com",
    hours: ["Pon-Pet: 09:00 - 21:00", "Subota: 09:00 - 18:00", "Nedelja: Ne radimo"],
    mapEmbedUrl: "https://www.google.com/maps?q=43.5805506,21.3256574&z=15&output=embed",
  },
];

export const DEFAULT_COMPANY_DOCUMENTS: CompanyDocumentLink[] = [
  {
    title: "Reklamacioni list",
    description: "Obrazac za podnosenje reklamacije.",
    url: "https://santos.rs/fajlovi/uputstvo/REKLAMACIONI%20LIST%281%29.pdf",
  },
  {
    title: "Formular za raskid ugovora",
    description: "Obrazac za odustanak od kupovine na daljinu.",
    url: "https://santos.rs/fajlovi/uputstvo/formular_za_raskid_ugovora.pdf",
  },
  {
    title: "Uputstvo za kupovinu",
    description: "Koraci kupovine, potvrda porudzbine i osnovna procedura.",
    url: "https://santos.rs/dokumenta",
  },
];

import type { Metadata } from "next";
import SuitSeoLandingPage from "@/app/(storefront)/components/SuitSeoLandingPage";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Odela Nis",
  description: "Odela u Nisu: Santos & Santorini showroom, muska odela, ready-to-wear modeli i preporuka za izbor velicine.",
  path: "/odela-nis",
  keywords: ["odela nis", "muska odela nis", "santos nis", "odelo nis"],
});

export const dynamic = "force-dynamic";

export default function OdelaNisPage() {
  return (
    <SuitSeoLandingPage
      path="/odela-nis"
      eyebrow="Odela u Nisu"
      title="Odela Nis"
      lead="Santos & Santorini u Nisu nudi muska odela, savete za izbor modela i direktnu podrsku za kupovinu."
      introTitle="Lokalni izbor uz online katalog"
      introCopy="Ako trazite odelo u Nisu, pocnite od online kataloga i izdvojenih modela, pa kontaktirajte tim za potvrdu velicine, dostupnosti i preporuku kombinacije."
      localNote="Prodajno mesto Santos & Santorini nalazi se u Obrenovicevoj 9 u Nisu."
      faq={[
        { question: "Gde se nalazi Santos & Santorini u Nisu?", answer: "Prodajno mesto je u Obrenovicevoj 9, Nis." },
        { question: "Da li mogu prvo da pogledam odela online?", answer: "Da, web shop prikazuje aktuelne modele, cene i dostupne velicine za upit ili porucivanje." },
        { question: "Da li mogu da dobijem preporuku za odelo?", answer: "Da, preko kontakt strane mozete poslati upit i dobiti preporuku prema prilici, velicini i stilu." },
      ]}
    />
  );
}

import type { Metadata } from "next";
import SuitSeoLandingPage from "@/app/(storefront)/components/SuitSeoLandingPage";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Odela Srbija",
  description: "Muska odela u Srbiji: Santos & Santorini ready-to-wear kolekcija, online upit i izbor modela za formalne prilike.",
  path: "/odela-srbija",
  keywords: ["odela srbija", "muska odela srbija", "kupovina odela online", "ready to wear odela"],
});

export const dynamic = "force-dynamic";

export default function OdelaSrbijaPage() {
  return (
    <SuitSeoLandingPage
      path="/odela-srbija"
      eyebrow="Odela u Srbiji"
      title="Odela Srbija"
      lead="Pregledajte muska odela Santos & Santorini i posaljite upit za model, velicinu i dostupnost."
      introTitle="Online izbor za kupce iz Srbije"
      introCopy="Santos & Santorini kombinuje online katalog i direktnu proveru dostupnosti. To pomaze kupcima koji zele da suze izbor pre kontakta ili posete prodajnom mestu."
      localNote="Za kupce iz Srbije dostupni su web shop, upit preko kontakt forme i podrska oko izbora velicine."
      faq={[
        { question: "Da li Santos prodaje odela kupcima iz cele Srbije?", answer: "Da, web shop omogucava pregled modela i slanje upita za dostupnost i isporuku." },
        { question: "Koja odela su najbolja za formalne prilike?", answer: "Najbolji izbor zavisi od prilike, kroja i boje; za svadbe i posao najcesce se biraju elegantni tamniji modeli." },
        { question: "Da li postoji pomoc pri izboru velicine?", answer: "Da, produkt stranice imaju vodic za velicinu, a tim moze potvrditi preporuku preko upita." },
      ]}
    />
  );
}

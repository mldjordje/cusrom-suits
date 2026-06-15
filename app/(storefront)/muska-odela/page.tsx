import type { Metadata } from "next";
import SuitSeoLandingPage from "@/app/(storefront)/components/SuitSeoLandingPage";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Muska odela",
  description: "Muska odela Santos & Santorini: ready-to-wear modeli, saveti za velicinu i direktan upit za preporuku.",
  path: "/muska-odela",
  keywords: ["muska odela", "musko odelo", "odela srbija", "santos odela"],
});

export const dynamic = "force-dynamic";

export default function MuskaOdelaPage() {
  return (
    <SuitSeoLandingPage
      path="/muska-odela"
      eyebrow="Santos & Santorini"
      title="Muska odela"
      lead="Izbor muskih odela za posao, svadbe, formalne dogadjaje i svakodnevnu eleganciju."
      introTitle="Kako izabrati pravo odelo"
      introCopy="Krenite od prilike, kroja i velicine. Ready-to-wear modeli su dobri kada zelite brzo resenje, dok je direktan upit najbolji kada niste sigurni oko velicine, materijala ili kombinovanja sa kosuljom i aksesoarima."
      localNote="Santos & Santorini nudi online pregled kolekcije i podrsku tima za izbor modela pre porucivanja."
      faq={[
        { question: "Da li Santos ima muska odela za svadbu?", answer: "Da, kolekcija obuhvata modele koji mogu biti izbor za mladozenju, goste i formalne prilike." },
        { question: "Kako da proverim velicinu odela?", answer: "Na produkt stranici proverite dostupne velicine i tabelu mera, a za finalnu preporuku mozete poslati upit timu." },
        { question: "Mogu li da kupim odelo online?", answer: "Da, artikal mozete dodati u korpu ili poslati upit, nakon cega tim potvrdjuje dostupnost i detalje." },
      ]}
    />
  );
}

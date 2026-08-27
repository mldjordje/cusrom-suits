"use client";

type Props = {
  lang?: string;
};

const PILLARS = [
  {
    icon: "🚚",
    title: "BESPLATNA ISPORUKA",
    desc: "Za sve porudžbine preko 15.000 RSD u celoj Srbiji.",
  },
  {
    icon: "✂️",
    title: "KOREKCIJA PO MERI",
    desc: "Besplatne korekcije i fiting dužine nogavica i rukava u salonu.",
  },
  {
    icon: "🔄",
    title: "ZAMENA & POVRAT",
    desc: "Jednostavna zamena veličine i sigurna kupovina u roku od 14 dana.",
  },
  {
    icon: "🏛️",
    title: "SHOWROOM NIŠ & KRUŠEVAC",
    desc: "Probajte modele uživo uz stručan savet naših krojača i stilista.",
  },
];

export default function LandingTrustPillars({ lang = "sr" }: Props) {
  const isEn = lang === "en";

  return (
    <section className="ss-lp-trust-section">
      <div className="container">
        <div className="row g-3 g-md-4">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="col-12 col-sm-6 col-lg-3">
              <div className="ss-lp-trust-card">
                <div className="ss-lp-trust-icon fs-4">{pillar.icon}</div>
                <h4 className="ss-lp-trust-title">{pillar.title}</h4>
                <p className="ss-lp-trust-desc">{pillar.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

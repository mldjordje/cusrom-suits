import Header from "./components/landing/Header";
import HeroSection from "./components/landing/HeroSection";
import Footer from "./components/landing/Footer";

const highlightCards = [
  {
    title: "Suit Concierge",
    description: "Personal stylists curate fabrics, linings, and finishing touches inspired by Hockerty-level clarity.",
    meta: "1:1 guidance",
  },
  {
    title: "Precision Drafting",
    description: "Digital patterns adapt in real time, mirroring the configurator experience clients expect online.",
    meta: "72 measurements",
  },
  {
    title: "Express Delivery",
    description: "Global atelier network delivers bespoke suits within four weeks without compromising craftsmanship.",
    meta: "Worldwide",
  },
];

const atelierStats = [
  { value: "350+", label: "Italian fabrics" },
  { value: "72", label: "Body measurements" },
  { value: "14", label: "Master tailors" },
];

const serviceSteps = [
  {
    title: "Consult",
    description: "Schedule a session online or in-store and preview silhouettes before you arrive.",
  },
  {
    title: "Customize",
    description: "Use the configurator to lock fabrics, lapels, and accents with photoreal clarity.",
  },
  {
    title: "Deliver",
    description: "Receive fitting-ready garments with video guidance for final tweaks.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#040404] text-white">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <HeroSection desktopVideoId="OZHIiph0j7Q" mobileVideoId="jv9L6R1KMRk" />

        <section id="collections" className="grid gap-6 rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.4em] text-gray-300">Collections</p>
            <h2 className="text-2xl font-semibold">Crafted like Hugo Boss, delivered like Hockerty.</h2>
            <p className="text-sm text-gray-300">
              Explore signature lines, from business essentials to ceremonial attire, all mirrored inside the configurator for a
              seamless jump into customization.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {highlightCards.map((card) => (
              <div key={card.title} className="rounded-3xl border border-white/10 bg-black/40 p-6">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{card.meta}</p>
                <h3 className="mt-4 text-xl font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm text-gray-300">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="atelier" className="grid gap-6 rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 via-transparent to-black p-8 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.4em] text-gray-300">Atelier</p>
            <h2 className="text-2xl font-semibold">The Santos & Santorini craft promise.</h2>
            <p className="text-sm text-gray-300">
              Each garment is stitched by master artisans. The online experience simply mirrors the precision already happening in
              the workroom, ensuring the legacy shop keeps running without disruption.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {atelierStats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/10 bg-black/40 p-4 text-center">
                <p className="text-3xl font-semibold">{stat.value}</p>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.4em] text-gray-300">Services</p>
            <h2 className="text-2xl font-semibold">From landing to configurator in one click.</h2>
            <p className="text-sm text-gray-300">
              Clients glide from this landing to /custom-suits without losing access to the legacy store routes.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {serviceSteps.map((step, index) => (
              <div key={step.title} className="rounded-3xl border border-white/15 bg-black/40 p-6">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Step {index + 1}</p>
                <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm text-gray-300">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

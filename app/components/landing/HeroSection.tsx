import Link from "next/link";

type HeroSectionProps = {
  desktopVideoId: string;
  mobileVideoId: string;
};

const buildEmbed = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0&showinfo=0`;

const HeroSection = ({ desktopVideoId, mobileVideoId }: HeroSectionProps) => {
  const desktopTitle = "Santos & Santorini hero desktop";
  const mobileTitle = "Santos & Santorini hero mobile";

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 hidden md:block">
          <iframe
            title={desktopTitle}
            src={buildEmbed(desktopVideoId)}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 scale-110"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        <div className="absolute inset-0 md:hidden">
          <iframe
            title={mobileTitle}
            src={buildEmbed(mobileVideoId)}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 scale-110"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/85 via-black/65 to-black/80"
        aria-hidden="true"
      />
      <div className="relative z-10 flex min-h-[100svh] items-center px-6 pb-16 pt-24 sm:px-12 lg:px-24">
        <div className="max-w-3xl space-y-6">
          <p className="text-[11px] uppercase tracking-[0.55em] text-gray-200">Custom studio</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">Custom Tailoring. Redefined.</h1>
          <p className="text-base text-gray-200 sm:text-lg">
            Discover a Hugo Boss inspired experience with full-screen visuals, elevated typography, and a configurator
            that feels as bespoke as the garments we craft.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/custom-suits"
              className="rounded-full bg-white px-8 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-black transition hover:bg-gray-200"
            >
              Start Customization
            </Link>
            <Link
              href="#collections"
              className="rounded-full border border-white/50 px-8 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-white/10"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;


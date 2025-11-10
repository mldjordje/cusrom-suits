import Link from "next/link";

type HeroSectionProps = {
  desktopVideoId: string;
  mobileVideoId: string;
};

const buildEmbed = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0&showinfo=0`;

const HeroSection = ({ desktopVideoId, mobileVideoId }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[80vh] w-full overflow-hidden rounded-[48px] border border-white/15 bg-black text-white shadow-[0_45px_120px_rgba(0,0,0,0.55)]">
      <div className="absolute inset-0">
        <iframe
          title="Santos & Santorini desktop hero"
          src={buildEmbed(desktopVideoId)}
          className="hidden h-full w-full md:block"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          tabIndex={-1}
          aria-hidden="true"
        />
        <iframe
          title="Santos & Santorini mobile hero"
          src={buildEmbed(mobileVideoId)}
          className="h-full w-full md:hidden"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/65 to-black/70" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[80vh] flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
        <p className="text-[11px] uppercase tracking-[0.55em] text-gray-200">Custom studio</p>
        <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">Custom Tailoring. Redefined.</h1>
        <p className="mt-5 max-w-2xl text-base text-gray-200 sm:text-lg">
          Discover a Hugo Boss inspired experience with full-screen visuals, elevated typography, and a
          configurator that feels as bespoke as the garments we craft.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
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
    </section>
  );
};

export default HeroSection;

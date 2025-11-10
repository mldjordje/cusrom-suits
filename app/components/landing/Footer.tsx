import Link from "next/link";

const quickLinks = [
  { href: "#collections", label: "Collections" },
  { href: "#atelier", label: "Atelier" },
  { href: "#services", label: "Services" },
];

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-black/80 text-gray-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-base font-semibold text-white">Santos & Santorini Atelier</p>
          <Link href="/custom-suits" className="text-[11px] uppercase tracking-[0.3em] text-white underline-offset-4 hover:underline">
            Start Customization
          </Link>
        </div>
        <div className="flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.3em]">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>
        <p className="text-[11px] text-gray-500">© {year} Santos & Santorini. Parallel shop experience remains live until integration is approved.</p>
      </div>
    </footer>
  );
};

export default Footer;


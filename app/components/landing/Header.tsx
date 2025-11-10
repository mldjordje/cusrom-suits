import Link from "next/link";

const navLinks = [
  { href: "#collections", label: "Collections" },
  { href: "#atelier", label: "Atelier" },
  { href: "#services", label: "Services" },
];

const Header = () => {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 text-white sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.45em]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">SS</span>
          <span className="hidden sm:inline">Santos & Santorini</span>
        </Link>
        <nav className="hidden items-center gap-6 text-[11px] uppercase tracking-[0.4em] text-gray-300 md:flex">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/custom-suits"
          className="rounded-full border border-white/40 px-5 py-2 text-[11px] uppercase tracking-[0.35em] text-white transition hover:border-white hover:bg-white hover:text-black"
        >
          Start Customization
        </Link>
      </div>
    </header>
  );
};

export default Header;

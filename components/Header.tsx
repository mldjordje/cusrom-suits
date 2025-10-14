// components/Header.tsx
import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full bg-black text-white z-[599] shadow-md transition-all duration-200">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        <Link href="/" className="text-white font-bold text-2xl">
          Santos & Santorini
        </Link>
        <nav>
          <ul className="flex space-x-6 font-medium">
            <li>
              <Link href="/nova-kolekcija" className="hover:text-gray-300">
                NOVA KOLEKCIJA
              </Link>
            </li>
            <li>
              <Link href="/odeca" className="hover:text-gray-300">
                Odeća
              </Link>
            </li>
            <li>
              <Link href="/obuca" className="hover:text-gray-300">
                Obuća
              </Link>
            </li>
            <li>
              <Link href="/aksesoari" className="hover:text-gray-300">
                Aksesoari
              </Link>
            </li>
            <li>
              <Link href="/akcije" className="hover:text-gray-300">
                Akcije
              </Link>
            </li>
            <li>
              <Link href="/info" className="hover:text-gray-300">
                Info
              </Link>
            </li>
            <li>
              <Link href="/pomoc" className="hover:text-gray-300">
                Pomoć
              </Link>
            </li>
            <li>
              <Link href="/kontakt" className="hover:text-gray-300">
                Kontakt
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";

/**
 * On-page manual. Category behaviour on this shop is genuinely non-obvious —
 * three sources feed it and two integrations read it — and that knowledge lived
 * only in the code. Written for the person using the screen, not for a
 * developer: no field names unless they appear in the UI.
 */
export default function CategoryGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-900">Kako rade kategorije — uputstvo</p>
          <p className="text-xs text-amber-800">
            Procitaj pre prve izmene: postoje tri izvora kategorija i dva sistema koji ih koriste (mOffice i Ananas).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-full border border-amber-300 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800"
        >
          {open ? "Sakrij uputstvo" : "Otvori uputstvo"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 grid gap-4 text-sm leading-relaxed text-amber-950">
          <section>
            <h3 className="mb-1 font-semibold">1. Odakle dolaze kategorije</h3>
            <p>Svaki artikal moze da dobije kategoriju iz tri izvora. Kada se preklope, vazi ovaj redosled:</p>
            <ol className="ml-5 mt-2 list-decimal space-y-1">
              <li>
                <strong>Admin kategorija</strong> — ono sto ti ovde kreiras i dodelis artiklu. Najjaci izvor: kada
                dodelis kategoriju, artikal se seli u nju i vise se ne prikazuje pod starom.
              </li>
              <li>
                <strong>Naziv artikla</strong> — sistem prepoznaje tip iz naziva i sifre modela („M. Kosulja“, „Automatik
                kais“…). Zato vecina artikala ima kategoriju iako im niko nista nije dodelio.
              </li>
              <li>
                <strong>mOffice grupa artikla</strong> — polje ARTIKAL_GRUPA iz mOffice-a. Koristi se kada naziv nista ne
                otkriva (npr. artikli koji se zovu samo „36/195/17“).
              </li>
            </ol>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">2. Dva nivoa kategorija</h3>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Glavne kategorije</strong> (Odela, Sakoi, Aksesoari…) su fiksne. Ne mogu se preimenovati ovde, ali
                mogu da se ukljuce/iskljuce iz prikaza dugmicima „Auto-kategorije“.
              </li>
              <li>
                <strong>Podkategorije</strong> su dve vrste. Plave (↳ Kaisevi, ↳ Novcanici) sistem prepoznaje sam iz
                naziva artikala. Ljubicaste su one koje ti kreiras dugmetom „+ podkategorija“ i rucno im dodeljujes
                artikle.
              </li>
              <li>
                Podkategorija se pojavljuje u meniju sajta tek kada ima bar jedan artikal koji je vidljiv u shopu — da
                kupac ne bi kliknuo na praznu stranu.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">3. Kako da dodas artikal u kategoriju</h3>
            <ol className="ml-5 list-decimal space-y-1">
              <li>Klikni na kategoriju u panelu „Kategorije koje kupci vide“ — otvara se spisak njenih artikala.</li>
              <li>Upisi SKU artikla i klikni „Dodaj u kategoriju“. „Izbaci iz kategorije“ radi obrnuto.</li>
              <li>
                Jedan SKU pokriva sve velicine tog modela, pa se izmena primenjuje na sve varijante odjednom. Broj
                azuriranih varijanti se ispise posle akcije.
              </li>
              <li>
                Ako artikal ne treba da ostane u staroj kategoriji, prvo ga izbaci iz nje — inace moze da se pojavi na
                dva mesta.
              </li>
            </ol>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">4. Iskljucivanje i brisanje</h3>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Glavne kategorije se ne brisu.</strong> One su fiksne — kvacica „U meniju“ ih pali i gasi za
                kupce. Iskljucena kategorija nestaje iz menija i filtera, ali artikli ostaju u shopu.
              </li>
              <li>
                <strong>Podkategorije koje si ti kreirao</strong> imaju „sakrij“ i „×“. „Sakrij“ je povratno; „×“ brise
                kategoriju zauvek.
              </li>
              <li>
                Ako je podkategorija dodeljena artiklima, brisanje pita za potvrdu i kaze na koliko artikala je
                dodeljena. Artikli se <strong>ne brisu</strong> — samo gube tu kategoriju i vracaju se pod svoju glavnu.
              </li>
              <li>Automatske (plave) podkategorije ne mogu da se obrisu — nastaju iz naziva artikala.</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">5. Sinhronizacija sa mOffice-om</h3>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                mOffice sinhronizacija <strong>ne brise</strong> tvoje dodele. Pre upisa se ponovo procitaju kategorije iz
                baze, pa izmena koju si sacuvao dok sync radi ne moze da se izgubi.
              </li>
              <li>
                mOffice salje svoju grupu artikla, ali ona sluzi samo kao rezerva kada artikal nema ni admin kategoriju ni
                prepoznatljiv naziv.
              </li>
              <li>Novi artikli iz mOffice-a stizu bez admin kategorije — rasporede se po nazivu, ili ostanu nerasporedjeni.</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">6. Sta Ananas dobija</h3>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                Ananas trazi svoju taksonomiju, ne nase nazive. Za artikle koji imaju upisanu Ananas kategoriju salje se
                ona.
              </li>
              <li>
                Za sve ostale salje se <strong>naziv prve kategorije artikla</strong>, a ako je nema — „Ostalo“. Znaci:
                kategorija koju ovde dodelis zavrsi i u Ananas izvozu.
              </li>
              <li>Ako menjas kategorije artiklima koji idu na Ananas, javi da se proveri mapiranje pre sledeceg izvoza.</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">7. Zasto se artikal ne vidi u kategoriji</h3>
            <p>U spisku artikala kolona „Status“ pokazuje razlog. Da bi kupac video artikal, mora sve od ovoga:</p>
            <ul className="ml-5 mt-1 list-disc space-y-1">
              <li>aktivan i izvezen (nije sakriven iz shopa),</li>
              <li>stanje vece od nule,</li>
              <li>ima sliku.</li>
            </ul>
            <p className="mt-1">
              Brojevi na kategorijama broje samo takve artikle, pa je normalno da je broj manji od onoga sto vidis u
              spisku.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">8. Redosled posla koji preporucujem</h3>
            <ol className="ml-5 list-decimal space-y-1">
              <li>Prvo „Auto-rasporedi proizvode“ — pokupi sve sto se prepoznaje po nazivu.</li>
              <li>Onda kreiraj podkategorije koje ti trebaju (npr. Aksesoari → Manzetne).</li>
              <li>Rucno dodaj SKU-ove koji nisu prepoznati, ili koje hoces drugde nego sto ih je sistem stavio.</li>
              <li>Na kraju proveri panel „Nedodeljeni proizvodi“ — tu su artikli bez ijedne kategorije.</li>
            </ol>
          </section>
        </div>
      ) : null}
    </div>
  );
}

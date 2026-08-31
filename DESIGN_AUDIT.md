# DESIGN AUDIT: santos.rs/landingv2
**Projekat:** Santos & Santorini — Redizajn Premium Brand Landing Stranice  
**Datum revizije:** 31. avgust 2026.  
**Auditor:** Lead Design & Creative Engineering  
**Status:** Faza 0 — Audit i arhitektura odluka (STOP pre implementacije)

---

## 1. UVOD I SUROVA ISTINA O TRENUTNOM STANJU

Trenutna verzija na `santos.rs/landingv2` predstavlja **akutnu krizu brend percepcije**. Santos & Santorini je kuća vrhunskog muškog krojenja po meri (sartoria), sa nasleđem od 2007. godine, koja radi sa prestižnim italijanskim tkaninama (Loro Piana, Vitale Barberis Canonico, Cerruti).

Međutim, ono što je trenutno na produkciji na `/landingv2` komunicira **jeftin dropshipping webshop ili korporativni uniformni katalog iz 2014. godine**:
1. **Nema logotipa nigde**: Posetilac ne zna na čijem se sajtu nalazi — u headeru i footeru stoji običan HTML tekst "Santos & Santorini".
2. **Ubačena je vrišteća žuta boja (`#d4af37`, `#e2c158`)**: Žuta nijansa jeftine mesingane bižuterije koja direktno degradira autentičnu Santos paletu prigušenog sartorial zlata (`#c9a96e`) i toplog mastila (`#0a0908`).
3. **Prikazuju se radničke uniforme umesto luksuznih odela**: U sekciji koja nosi natpis *"Krojeno jednom, nošeno godinama"* i *"Šezdeset mera, jedan kroj"* vrti se video radnika u kratkoj beloj uniformnoj košulji sa logotipom **Merkur XTip kladionice** i video ženskog radnog mantila!
4. **Hero je pretrpan kao reklamni flajer**: Čak 6 tekstualnih elemenata, 40+ reči, 2 dugmeta, 3 statistička boksa i 2 bedža, dok je vizuelni identitet potpuno ugušen.
5. **Nula "Wow" trenutaka i nula scroll-driven animacija**: Nema sekcija kontrolisanih scroll-om (pinned scrub), nema dubinskog paralaksa, nema kontinuiteta. Sve deluje statično, ravno i dosadno.

---

## 2. AUDIT PO SEKCIJAMA

### 2.1. Header & Navigacija
- **Šta je loše**:
  - **Logo**: Ne postoji logo znak. Prikazan je generički tekst `Santos & Santorini` u serifnom fontu, uz podnaslov `Sartoria Italiana • Po Meri`.
  - **Dugmad i linkovi**: CTA dugme *"Zakažite termin"* u zaglavlju koristi generički beli boks sa oštrom ivicom, dok su linkovi zbijeni i bez ikakvog premium hover micro-feedbacka (nema magnetnog efekta, nema elegantnog underline širenja).
  - **Stakleni efekat (Frosted glass)**: Pozadina hedera ima jeftin `backdrop-filter: blur(12px)` sa agresivnim crnim gradijentom koji na skrolu deluje prljavo na svetlim sekcijama.
- **Zašto ruši premium percepciju**:
  - Svaki svetski luksuzni brend (Zegna, Tom Ford, Loro Piana) ima besprekorno pozicioniran, čist logotip. Izostanak logotipa posetiocu podsvesno sugeriše "nedovršen sajt" ili "lažni brend".
- **Konkretna zamena**:
  - Integracija zvaničnog Santos logoa: na tamnoj podlozi `/img/logo-header.png` (ili optimizovani monohromatski vektorski SVG), na svetloj `/img/logo-header-dark.png`.
  - Minimalistički, aerodinamičan header visine 72px koji na scroll glatko prelazi u ultra-luksuzni tamni translucent bar (`rgba(10, 9, 8, 0.85)` + `backdrop-filter: blur(20px)` + hairline bordura `rgba(242, 238, 231, 0.08)`).
  - CTA dugme u headeru: elegantan `outline` sa Santos zlatom (`#c9a96e`), fine tipografije sa trackingom `0.15em`, sa glatkom hover ispunom.

---

### 2.2. Hero Sekcija
- **Šta je loše**:
  - **Tekstualna deponija (Copy density)**: Ekran je ugušen tekstom.
    - Eyebrow pilula: `• SARTORIA ITALIANA • RUČNA IZRADA • NIŠ & KRUŠEVAC`
    - Naslov u 3 reda: `ODELO KOJE PAMTI VAŠE DRŽANJE`
    - Opisni pasus od 21 reči: `Vrhunski italijanski štofovi od čiste vune Loro Piana i Cerruti, preko 60 preciznih mera i besprekorna ručna izrada u našim ateljeima.`
    - Dva velika dugmeta jedno pored drugog: `ISTRAŽITE KOLEKCIJU ->` (vrišteće žuto) i `KONFIGURIŠITE PO MERI`
    - Na dnu ekrana još 3 statistička boksa sa brojkama (`100%`, `60+`, `2`)
  - **Boja**: Dugme `ISTRAŽITE KOLEKCIJU` je u oštroj žutoj boji (`#d4af37`), koja na tamnoj pozadini izgleda jeftino.
  - **Video**: U pozadini se učitava video koji se bori sa 5 slojeva teksta i tamnim radijalnim gradijentom koji ubija dubinu snimka.
- **Zašto ruši premium percepciju**:
  - Luksuz se ne objašnjava esejom u prvom ekranu; luksuz se oseća kroz kompoziciju, atmosferu i vizuelni autoritet. Trenutni hero deluje kao landing stranica za prodajni kurs sa previše CTA dugmadi i statičkih brojača.
- **Konkretna zamena**:
  - **Maksimalno 3 tekstualna elementa**:
    1. Kicker / Eyebrow: `SANTOS & SANTORINI — ATELIER` (ili godina `OD 2007`) — max 4 reči.
    2. Headline: `Sartoria bez kompromisa.` (3 reči) ili `Odelo koje pamti vaše držanje.` (5 reči).
    3. Podnaslov: `Italijanske tkanine. Ručni rad. Savršen kroj.` (6 reči).
    4. Jedan jedini primarni CTA: `Istražite kolekciju` (suptilno definisan, sa magnetnim hoverom i strelicom).
  - Statističke boksove i sekundarni CTA potpuno izmestiti iz Hero sekcije u odgovarajuće tematske sekcije niže na stranici.
  - Pun cinematic video viewport (100vh) sa kinematografskim osvetljenjem, gde tekst diskretno pluta u donjoj trećini ekrana preko suptilnog filmskog scrim gradijenta.

---

### 2.3. Manifest Sekcija (01 — Manifest)
- **Šta je loše**:
  - Ogroman natpis `NE PRAVIMO ODELA ZA SVE PRILIKE. PRAVIMO JEDNO, ZA VAŠU.` bačen na veliku belu/svetlu površinu (`#f2f0ed`) bez ikakve vizuelne težine, pratećeg medija ili dinamičkog elementa.
  - Nagli, nepripremljeni prelaz sa tamnog Hero videa na svetli karton ruši kontinuitet filmskog doživljaja.
- **Zašto ruši premium percepciju**:
  - Deluje prazno i nezavršeno, kao slajd u PowerPoint prezentaciji.
- **Konkretna zamena**:
  - Pinned scroll-driven split: Tokom scrolla, tipografija se reč-po-reč ili liniju-po-liniju otkriva (staggered clip-path reveal) preko tamne luksuzne pozadine (`#0a0908`), dok u pozadini glatko klizi slow-motion makro detalj teksture štofa (Loro Piana vuna pod svetlom) sa dubinskim paralaksom.

---

### 2.4. Kolekcija / Kategorije (02 — Kolekcija)
- **Šta je loše**:
  - Asimetrični grid od 4 kartice (Odela, Košulje, Obuća, Aksesoari) sa brojevima 01, 02, 03, 04 i tekstom u donjem uglu.
  - Kartica za obuću prikazuje modela na betonskom keju kako se naslanja na zarđali ulični stub sa belim patikama.
  - Kartica za košulje je bleda studijska fotografija bez atmosfere.
  - Paralaksa je rešena primitivnim inline style listenerom koji samo blago pomera `translateY`, bez dubine i mekoće.
- **Zašto ruši premium percepciju**:
  - Zarđali ulični stub i neujednačen stil fotografije uništavaju iluziju italijanskog luksuza. Fotografije nemaju isti color grading, niti umetničku direkciju.
- **Konkretna zamena**:
  - Horizontalni kurirani runway ili glatki pinned horizontal scrub na desktopu sa velikim editorial formatom fotografija.
  - Primena unificiranog toplog sartorial gradinga, zamena kadra za obuću visokokvalitetnom fotografijom ručno rađenih kožnih cipela.
  - Prilikom prelaza mišem (hover), suptilni zoom (`scale(1.04)`) uz glatko zatamnjenje i pojavu naziva kategorije u plemenitom serif fontu (Marcellus/Playfair) sa tankom zlatnom linijom (`#c9a96e`).

---

### 2.5. Sartoria / Bespoke Sekcija (03 — Sartoria)
- **Šta je loše**:
  - Sekcija ima 4 koraka (Vuna, Spalla camicia, AMF štep, Vaša mera) i desno rotirajući set statičnih slika.
  - Koraci su obične tekstualne stavke sa tankim linijama.
  - Na mobilnom telefonu sekcija postaje beskonačan vertikalni spisak običnog teksta.
- **Zašto ruši premium percepciju**:
  - Ovo je najvažnija sekcija za brend koji nudi krojenje po meri! Umesto da demonstrira majstorstvo zanata (bespoke craft) kroz interakciju, deluje kao lista tehničkih specifikacija.
- **Konkretna zamena — OVDE LEŽI "WOW MOMENT"**:
  - **Pinned Interactive Tailoring Anatomy**: Ekran se zaključava (pinned section), dok scroll korisnika kontroliše vremensku liniju (scrub timeline).
  - Sa leve strane fiksirani vertikalni timeline glatko prebacuje faze izrade (I. Selekcija Vune -> II. Konstrukcija Ramena -> III. Ručni Štep -> IV. 60 Anatomskih Mera), dok se sa desne strane pod scrub animacijom smenjuju cinematic video/makro snimci krojenja: sečenje štofa, formiranje kanvasa, ručno provlačenje igle i finalno odelo na silueti.

---

### 2.6. Video Bandovi (U Ateljeu / Po Meri) — NAJVEĆI PROBLEM
- **Šta je loše**:
  - **Sadržaj videa**: Prikazuje se radnik u uniformi sa logom Merkur XTip kladionice i žena u bolničko-laboratorijskom mantilu!
  - **Format i kompozicija**: Kvadratni video snimljen u lošim uslovima sa belom pozadinom, razvučen preko mutnog bekgraunda (blurred backdrop).
  - Preko toga velikim fontom piše *"KROJENO JEDNOM, NOŠENO GODINAMA"*.
- **Zašto ruši premium percepciju**:
  - Povezivanje premium italijanske sartorije sa jeftinim radnim uniformama sportske kladionice je marketinška i vizuelna katastrofa.
- **Konkretna zamena**:
  - Trenutno uklanjanje svih uniformnih klipova sa ove stranice.
  - Implementacija novih produkcijskih snimaka iz ateljea i proizvodnje koje je klijent uploadovao (pogledati detaljnu video analizu u sekciji 4).
  - Prikaz u punoj širini (full-bleed cinematic banner) sa filmskim odnosom stranica (21:9 ili 16:9), suptilnim vinjetiranjem i diskretnim tipografskim natpisom.

---

### 2.7. Kurirana Selekcija / Izdvojeno (04 — Izbor)
- **Šta je loše**:
  - Četiri proizvoda raspoređena u nepravilnom rasteru (6/5 i 5/6 stubaca) na sivkasto-žutoj papirnatoj podlozi (`--paper: #f2f0ed`).
  - Proizvodi su izrezani na beloj podlozi i nalepljeni preko bež kartona, što stvara ružne bele kvadrate oko odeće ako slika nema transparentnost.
  - Kartice nemaju hover promenu slike, nemaju prikaz tkanine, niti brzu akciju za pregled detalja.
- **Zašto ruši premium percepciju**:
  - Izgleda kao neuspeo eksperiment sa asimetrijom koji otežava pregled odeće.
- **Konkretna zamena**:
  - Elegantna, uravnotežena editorial galerija.
  - Svaka kartica ima: primarnu sliku modela + suptilnu hover sliku detalja/teksture (dual-image crossfade na hover), naziv modela, cenu formatiranu u dinarima sa diskretnim zlatnim akcentom, i natpis tkanine (npr. *100% Loro Piana vuna*).

---

### 2.8. Saloni / Atelijeri (05 — Saloni)
- **Šta je loše**:
  - Spisak gradova (Niš, Kruševac) sa adresama poređan u običnom tekstu sa garancijama ("Besplatna dostava", "Korekcija u salonu") koje zvuče kao e-commerce shop sa elektronskim uređajima.
  - Nema mapa, nema fotografija enterijera salona, nema osećaja ekskluzivnosti i privatnog termina.
- **Zašto ruši premium percepciju**:
  - Odlazak u sartoria salon je ritual i VIP iskustvo. Prikazivanje salona kao običnih adresa sa garancijom o povratu novca obara doživljaj na nivo masovne konfekcije.
- **Konkretna zamena**:
  - Dve monumentalne kartice (Niš i Kruševac) sa fotografijama enterijera salona, radnim vremenom, adresom i dugmetom *"Zakažite privatnu probu"* koje otvara interaktivni booking modal ili vodi direktno na kontakt sa stilistom.

---

### 2.9. Footer
- **Šta je loše**:
  - Opet nema logotipa, samo običan tekst `Santos & Santorini`.
  - Kolone linkova su generičke, poravnanje je sirovo.
  - Fale direktni kontakti, radno vreme salona, linkovi ka društvenim mrežama, i oznaka italijanskog porekla tkanina.
- **Zašto ruši premium percepciju**:
  - Footer je poslednji utisak koji posetilac nosi sa sobom. Trenutni footer izgleda kao završetak generičkog bloga.
- **Konkretna zamena**:
  - Zlatni logo brenda na vrhu footera.
  - Prefinjeni stupci u dubokoj toploj crnoj podlozi (`#0a0908`), hairlines (`rgba(242, 238, 231, 0.1)`), jasni kontakti salona, diskretna navigacija i newsletter input sa zlatnim dugmetom.

---

## 3. BRAND IDENTITET I TOKENSKA DISCIPLINA

### 3.1. Uklanjanje ne-brendirane žute boje
U `app/landingv2/landing.module.scss` je identifikovano više pojava agresivnih žutih boja:
- `#d4af37` (tzv. "Champagne accent" – vrišteća mesing žuta)
- `#e2c158` (svetlija žuta za hover dugmadi)
- `#d4af37` box-shadow i bordure
**Odluka:** Sve ove vrednosti se **brišu 100%**. Nijedan piksel žute boje se ne sme renderovati.

### 3.2. Zvanični Santos Brand Tokani (iz `santos-lux.scss`)
Usklađujemo se sa definisanim luksuznim slojem projekta:
```scss
/* Santos Luxury Design Tokens */
$lux-ink-0: #0a0908;        // Osnovna pozadina (topla skoro-crna, ne cheap #000)
$lux-ink-1: #100e0c;        // Podignuti pojasevi / sekcije
$lux-ink-2: #17140f;        // Kartice i površine
$lux-ink-3: #211c16;        // Kartice hover / input polja

$lux-fg: #f2eee7;           // Primarni tekst (topla bela, nikad sterilna #fff)
$lux-fg-soft: #a79e92;      // Sekundarni tekst / opisi
$lux-fg-faint: #756b60;     // Meta podaci, redni brojevi, kicker tekst

$lux-gold: #c9a96e;         // Autentično Santos zlato (prigušeno, plemenito)
$lux-gold-bright: #e3c88f;  // Zlato za hover stanje i fokus
$lux-gold-dim: rgba(201, 169, 110, 0.15); // Suptilni akcenti i bedževi

$lux-line: rgba(242, 238, 231, 0.08);       // Hairline linije i struktura
$lux-line-strong: rgba(242, 238, 231, 0.18); // Istaknute separacije
```

### 3.3. Zvanični Logo Asset
Zvanični logo resursi identifikovani u repozitorijumu:
- Svetli logo za tamne podloge (Hero, Header, Footer, Preloader):
  **`/img/logo-header.png`** (Desktop) i **`/img/logo-header-mobile.png`** (Mobile)
- Tamni logo za eventualne svetle podloge:
  **`/img/logo-header-dark.png`**
- Monohromatski vektorski SVG fallback za maksimalnu oštrinu na retina ekranima.

---

## 4. ANALIZA VIDEO KLIPOVA IZ ADMINA I SERVERA

Detaljnim pregledom FTP baze (`assets.santos.rs`) i Supabase skladišta pronađena je kompletna lista video zapisa. Izvršena je detaljna selekcija:

### Tabela pronađenih video snimaka:

| Fajl / Putanja | Veličina | Sadržaj i karakteristika | Ocena | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/fajlovi/site-assets/2026-08-21/1787302307595-39dcdc2a-6f15-4a07-9b7b-ade379a2cd80-proizvodnja-santos-video-hero.mp4` | 27.16 MB | **Proizvodnja Santos Video Hero**: Novi profesionalni kinematografski video procesa izrade, krojenja i šivenja odela u Santos pogonima. Vrhunsko osvetljenje, makro kadrovi vune, peglanja i ručnog boda. | **10/10** | **PREDLOG: PRIMARNI HERO VIDEO** |
| `/fajlovi/site-assets/2026-08-20/1787230374343-6944820d-de7e-47ce-896b-fb0755d3463c-kompresovanmp4-final_pj2zx3qu.mp4` | 13.20 MB | **Santos Video Final Kompresovan**: Optimizovana verzija brend videa. Odličan framing za overlay teksta, dobar ritam i prirodan loop. | **9/10** | **PREDLOG: ALTERNATIVNI HERO / LORDS CUT** |
| `/fajlovi/site-assets/2026-08-20/1787230677551-680a41ea-75c9-4843-b64c-9c8f4a867eb5-proizvodnja-santos-video.mp4` | 18.55 MB | **Proizvodnja Santos Craft**: Fokus na majstore za mašinama i ručne detalje. Savršen za sekciju krojenja (Sartoria). | **9.5/10** | **PREDLOG: BESPOKE CRAFT SCRUB VIDEO** |
| `/fajlovi/video/Santos Santorini FUL HD v2.mp4` | 35.21 MB | **Kampanja Santos Santorini Full HD**: Modeli u punim smoking i bespoke odelima u luksuznom ambijentu. | **8.5/10** | **PREDLOG: EDITORIAL VIDEO BAND** |
| `/fajlovi/site-assets/2026-06-26/1782479294089-23dba50b-06d9-4c04-9ecf-5ee300f08788-mlg_1781.mp4` | 47.73 MB | Sirov video snimak visoke rezolucije. | 6/10 | Rezerva |
| `/fajlovi/uniforme/Santos uniforma kosulja kratak rukav.mp4` | 4.78 MB | **RADNIČKA UNIFORMA (MERKUR XTIP KLADIONICA)**: Jeftina bela radna košulja sa reklamom na grudima. | **0/10** | **HITNO UKLONITI** |
| `/fajlovi/uniforme/Santos zenska uniforma mantil.mp4` | 4.78 MB | **RADNI MANTIL**: Medicinska / laboratorijska radna oprema. | **0/10** | **HITNO UKLONITI** |
| `/fajlovi/uniforme/Santos uniforma pantalone jakna.mp4` | 3.89 MB | **RADNA JAKNA I PANTALONE**: Industrijska uniforma. | **0/10** | **HITNO UKLONITI** |

### Zvanični predlog izbora videa:
1. **Hero sekcija**: `proizvodnja-santos-video-hero.mp4` (ili optimizovana verzija `kompresovanmp4-final_pj2zx3qu.mp4`) — stvara neposredni utisak elitne manufakture i sartorial tradicije.
2. **Bespoke / Sartoria sekcija**: `proizvodnja-santos-video.mp4` — snimci ruku majstora, igle, konca i tkanina koji prate faze šivenja po meri.
3. **Mid-page Cinematic Break**: `Santos Santorini FUL HD v2.mp4` — elegantan maneken u ambijentu koji demonstrira kako odelo stoji u pokretu.

---

## 5. REFERENCE I ŠTA TAČNO PREUZIMAMO

1. **Zegna (zegna.com)**
   - *Šta preuzimamo:* **OASI ZEGNA ritam tipografije i tihi luksuz (Quiet Luxury).** Minimalistički naslovi, ultra-visok kontrast bez šarenih bedževa, tekst koji ne objašnjava već intrigira. Korišćenje jednog dominantnog CTA elementa po ekranu.
2. **Brunello Cucinelli (brunellocucinelli.com)**
   - *Šta preuzimamo:* **Filozofiju palete i toplinu materijala.** Prelazi između mekih tonova tamnog uglja (`#0a0908`), toplog kašmira i diskretnog zlata. Fotografije koje uvek slave poreklo vlakana i zanatliju.
3. **Suitsupply (suitsupply.com)**
   - *Šta preuzimamo:* **Funkcionalnu jasnoću i dual-image interakciju na karticama odela.** Na desktopu hover preko kartice odela trenutno i glatko (crossfade 350ms) prikazuje krupan plan tkanine ili modela u profilu.
4. **Tom Ford (tomford.com)**
   - *Šta preuzimamo:* **Dramatični kinematografski framing i snažnu siluetu.** Hero sekcija bez nepotrebnog praznog prostora, video od ivice do ivice sa preciznim vertikalnim centriranjem, agresivno suzbijanje nepotrebnog body teksta.
5. **Loro Piana (loropiana.com)**
   - *Šta preuzimamo:* **Makro prikaze tekstura i storytelling o vlaknima.** Uvođenje mikro-oznaka o poreklu štofova ("Super 150s Pure Wool", "Woven in Biella, Italy").
6. **Locomotive Studio / Active Theory (Awwwards SOTD)**
   - *Šta preuzimamo:* **Pinned Scrub Timeline & Seamless Section Blending.** Tehnika gde skrol ne samo da aktivira CSS animaciju, već direktno pokreće GSAP scrub timeline (skrolujući korisnik bukvalno "kroji" odelo kroz frejmove).

---

## 6. MOTION ARHITEKTURA

- **Biblioteke:** `Lenis` (verzija 1.3.26 već prisutna u projektu) za uniformisani smooth inertia scroll + `GSAP` (verzija 3.14.2) & `ScrollTrigger` za orkestraciju vremenskih linija.
- **Principi pokreta:**
  - **Pinned Scrubbing:** Sekcija Sartorije je fiksirana dok korisnik skroluje; leva strana menja faze izrade, dok desna strana menja makro kadrove u savršenoj sinhronizaciji.
  - **Staggered Line Masking:** Naslovi se ne pojavljuju običnim fade-in efektom; svaka linija teksta izlazi iz svog nevidljivog `overflow: hidden` kontejnera sa custom cubic-bezier krivom (`cubic-bezier(0.16, 1, 0.3, 1)`).
  - **Multi-layer Parallax:** Pozadinski video, dekorativne numeracije sekcija i kartice se kreću različitim faktorima brzine (0.15, 0.4, 0.8), stvarajući dubinu analognog prostora.
  - **Seamless Continuity:** Izlazni elementi jedne sekcije uvode sledeću kroz clip-path skupljanje ili širenje.
  - **Accessibility Guardrail:** `@media (prefers-reduced-motion: reduce)` automatski deaktivira Lenis, gasi sve GSAP scrub timeline-ove i postavlja sve elemente u finalno vidljivo stanje sa nultim kašnjenjem.

---

## 7. CENTRALNI "WOW MOMENT" STRANICE

**Definicija:** *The Deconstructed Bespoke Scrub (Anatomija Sartorije)*.  
Kada korisnik dođe do sekcije krojenja po meri, stranica se fiksira na ekranu. Kako korisnik nastavlja da vrti točkić miša:
1. Prikazuje se balirana sirova vuna iz Bielle uz tekst o Loro Piana tkaninama.
2. Sledećim okretom točkića, kamera glatko zumira na precizno sečenje šablona i anatomsko formiranje napuljskog ramena (*Spalla camicia*).
3. U trećem koraku fokus ide na makro kadar AMF ručnog boda koji se šije u realnom vremenu uz animiranu zlatnu nit.
4. U četvrtom koraku dobija se prikaz gotovog odela na manekenu uz poziv na konfigurisanje i personalnu probu.

Korisnik ne pasivno gleda slajder — njegov prst na mišu ili ekranu telefona direktno kontroliše magiju izrade odela.

---

## 8. TABELA ODLUKA I PRIORITETA (FAZA 0 REZIME)

| Sekcija | Detektovan Problem | Odluka i Arhitektura Rešenja | Prioritet |
| :--- | :--- | :--- | :--- |
| **Global / Paleta** | Ubačena žuta `#d4af37` i `#e2c158`; odstupanje od brenda | Potpuno brisanje svih žutih heksadecimalnih kodova. Zamena zvaničnim Santos tokenima: `--lux-gold: #c9a96e`, `--lux-ink-0: #0a0908`. | **P0** |
| **Global / Branding** | Logo ne postoji (Header, Footer, Preloader) | Integracija zvaničnog Santos logotipa na sva 3 mesta (`/img/logo-header.png` / SVG). | **P0** |
| **Video Klipovi** | Prikazuju se uniforme Merkur XTip kladionice i mantili | Kompletno uklanjanje uniformi. Postavljanje novog `proizvodnja-santos-video-hero.mp4` i `proizvodnja-santos-video.mp4` iz admin baze. | **P0** |
| **Hero Sekcija** | Pretrpan tekstom (6 elemenata, 40+ reči, 2 CTA, 3 stats boksa) | Redukcija na 1 naslov (max 5 reči), 1 podnaslov (max 10 reči) i 1 primarni CTA. Kinematografski full-bleed video sa filmskim scrimom. | **P0** |
| **Bespoke / Craft** | Statična dosadna lista bez vizuelnog autoriteta | Implementacija centralnog "WOW" momenta: Pinned GSAP ScrollTrigger scrub koji vodi korisnika kroz anatomiju šivenja po meri. | **P0** |
| **Kolekcija / Kategorije** | Slika obuće na zarđalom uličnom stubu; slabe slike | Zamena editorial slikama vrhunskog kvaliteta; uvođenje horizontalnog scroll runway-a sa finim paralaksom. | **P1** |
| **Curated Edit** | Proizvodi isečeni na belim kartonima bez hover detalja | Postavljanje dual-image crossfade efekta na karticama (model + makro tekstura tkanine) na tamnim luksuznim pločama. | **P1** |
| **Saloni (Ateliers)** | Prikazani kao servisne adrese sa e-commerce garancijama | Redizajn u dve ekskluzivne kartice salona (Niš i Kruševac) sa atmosferom privatnog termina i zakazivanjem. | **P1** |
| **Header & Navigacija** | Grubi beli boks dugmeta; zbijeni linkovi | Redizajn u minimalistički floating frosted header visine 72px sa zlatnim outline dugmetom i logo znakom. | **P1** |
| **Footer** | Tekstualni footer bez logotipa i pravih kontakata | Luksuzni tamni footer sa zlatnim logotipom, podacima salona, radnim vremenom i finim hairline podelama. | **P2** |
| **Performance & A11y** | Rizik od LCP penala zbog teških videa | `preload="none"` na video trakama ispod folda, poster placeholderi, WebM/MP4 fallback, puni `prefers-reduced-motion` bypass. | **P0** |

---

> [!IMPORTANT]
> **ZAKLJUČAK FAZE 0:**
> Ovaj audit postavlja nultu toleranciju za generičke elemente, žutu boju i radničke uniforme. Stranica se transformiše u digitalni ekvivalent ulaska u privatni salon visoke italijanske mode u Milanu ili Napulju.
> 
> **Čeka se vaša potvrda pre početka Faze 1 (predlog konačnih video klipova i definisanje dizajnerskih tokena).**

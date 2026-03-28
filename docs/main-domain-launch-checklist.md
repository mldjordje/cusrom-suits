# Main Domain Launch Checklist

Status date: 2026-03-27

Ovo je operativni checklist za pustanje novog Santos web shopa na glavni domen `santos.rs`.

## 1. Obavezno pre produkcije

- Potvrditi da novi build prolazi lokalno i na hosting okruzenju.
- Potvrditi da `catalog_products` i `catalog_product_media` u Supabase imaju sveze podatke iz poslednjeg SQL dumpa.
- Pustiti `supabase/sql/content_schema.sql` u pravom Supabase projektu.
- Nakon toga pokrenuti `npm run import:legacy-content`.
- Proveriti da `content_posts` vraca podatke kroz `/api/blog/posts`.
- Proveriti da admin login i admin cookie tok rade na produkcionom domenu.
- Proveriti `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` i `SUPABASE_SERVICE_ROLE_KEY` na produkciji.
- Proveriti `ADMIN_ACCESS_TOKEN` na produkciji.
- Ako stari asset server ostaje van novog Next app-a, postaviti `LEGACY_ASSET_ORIGIN` na produkciji da `/fajlovi/**` ide na legacy origin.
- Proveriti da slike i PDF-ovi sa `https://santos.rs/fajlovi/**` rade bez 404 posle promene glavnog domena.

## 2. Redirecti i SEO

- Potvrditi redirecte iz stare strukture: `/contact`, `/documents`, `/prodavnice`, `/korpa`, `/shop`, `/pocetna`.
- Dodatno mapirati stare legacy product URL-ove ako postoje aktivni backlinkovi ka njima.
- Proveriti generisani `sitemap.xml`.
- Proveriti `robots.txt`.
- Proveriti canonical URL-ove na home, category listing i product strani.

## 3. Storefront QA

- Home:
  - hero sekcija
  - sekcije proizvoda
  - dokumenta blok
  - poslovne uniforme blok
  - blog blok
- Web shop listing:
  - pretraga
  - filter kategorije
  - filter `na stanju`
  - filter `na akciji`
  - sortiranja
  - mobile filter UX
- Product detail:
  - galerija
  - izbor velicine
  - size guide modal
  - add to cart
  - kontakt upit za konkretan proizvod
- Kontakt:
  - slanje forme
  - izbor lokacije
- Dokumenta:
  - sva 3 glavna download linka
  - pravne stranice (`/polisa_privatnosti`, `/uslovi_kupovine`, `/reklamacije`, `/isporuka`, `/uslovi_koriscenja_kolacica`, `/nacinplacanja`)
- Prodajna mesta:
  - Nis
  - Krusevac

## 4. Admin QA

- `Web Shop -> Proizvodi i lager`
- `Web Shop -> Akcije i snizenja`
- `Web Shop -> Pocetna i sekcije`
- `Porudzbine`
- `Kontakt poruke`
- `Newsletter`
- `Blog Posts`
- `Integracije`

## 5. Prodajni minimum koji mora da radi

- Kupac moze lako da nadje proizvod.
- Kupac moze lako da proveri velicinu.
- Kupac moze lako da doda proizvod u korpu.
- Kupac moze lako da posalje porudzbinu/upit.
- Admin odmah vidi porudzbinu, kontakt kanal i zeljenu lokaciju.

## 6. Pozeljno odmah posle pushtanja

- Napraviti dodatni redirect layer za stare product permalinkove.
- Uvesti bolji blog/category import sa kategorijama.
- Uvesti eksport newsletter liste iz admina.
- Uvesti osnovni lead tagging za kontakt poruke i porudzbine.
- Doraditi product trust blokove i merchandising po kategorijama.

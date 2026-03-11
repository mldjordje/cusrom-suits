# Sprint 1: Webshop/Admin Baseline Stabilization

## Scope

- Fokus: storefront + admin + integrations operativna stabilnost
- Van scope: custom suits feature razvoj

## Exit Criteria

1. Build i lint prolaze bez error-a.
2. Integrations core test prolazi.
3. Smoke provera javnih storefront ruta prolazi.
4. Smoke provera admin ruta/API prolazi kada je postavljen `ADMIN_ACCESS_TOKEN`.
5. README i root metadata su uskladjeni sa projektom.
6. Definisan je minimalni smoke-check tok za lokalno i staging okruzenje.

## Commands

```bash
npm run lint
npm run build
npm run test:integrations
npm run smoke:webshop-admin
```

Ako proveravas staging:

```bash
SMOKE_BASE_URL=https://your-staging-domain npm run smoke:webshop-admin
```

Ako je admin zasticen:

```bash
ADMIN_ACCESS_TOKEN=your-token npm run smoke:webshop-admin
```

## Notes

- Smoke check ne menja podatke: koristi samo `GET` rute.
- Ako `ADMIN_ACCESS_TOKEN` nije prosledjen, admin API rute se preskacu.
- Za deploy gate dovoljno je da sva 4 command-a prodju u CI ili rucno.

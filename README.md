This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Custom Suits CMS and Features

- Fabrics CMS: visit `/admin/fabrics` to add fabrics with price, description, tone and two zoom images. API: `GET/POST/PUT /api/fabrics` (file-backed at `data/fabrics.json`).
- Linings CMS: visit `/admin/linings` to manage lining names and prices. API: `GET/POST/PUT /api/linings` (file-backed at `data/linings.json`).
- Configurator: `/custom-suits` uses the local fabrics API; Sidebar shows “CMS za tkanine” link.
- Preview: pinch/scroll (wheel) to zoom, drag to pan. Shirt overlay toggle and pants pleats option added under Style.
- Measurements: continue to `/custom-suits/measure` to input height/weight/age and see auto recommendations.

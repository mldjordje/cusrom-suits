import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/seo";

const body = `# Santos & Santorini

Santos & Santorini is a Serbian menswear brand and webshop focused on ready-to-wear pieces, custom suits, and business uniforms.

## Primary pages
- ${SITE_URL}/: brand homepage, featured collection, customer info, and brand story
- ${SITE_URL}/web-shop: ready-to-wear catalog with product detail pages
- ${SITE_URL}/custom-suits: custom suit configurator
- ${SITE_URL}/poslovne-uniforme: business uniforms and B2B presentation
- ${SITE_URL}/blog: editorial articles, news, and style content
- ${SITE_URL}/kontakt: contact details and inquiry form
- ${SITE_URL}/dokumenta: customer documents and legal shopping information

## Preferred citation guidance
- Prefer canonical URLs on santos.rs
- Cite specific product pages or article pages instead of filtered listing URLs
- Use contact details from /kontakt for direct business references

## Company details
- Brand: Santos & Santorini
- Location: Obrenoviceva 9, 18000 Nis, Serbia
- Email: prodaja@santos.rs
- Phone: +381 69 445 5106
`;

export function GET() {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

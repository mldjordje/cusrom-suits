import Link from "next/link";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";

export const metadata = {
  title: "Stranica nije pronađena | Santos & Santorini",
  description: "Tražena stranica ne postoji u Santos & Santorini web shopu.",
};

export default function NotFound() {
  return (
    <>
      <StorefrontHeader />
      <main
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "4rem 1.5rem",
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#999",
            marginBottom: "1rem",
          }}
        >
          Santos &amp; Santorini
        </p>
        <h1
          style={{
            fontSize: "clamp(2rem, 8vw, 4rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: "1rem",
            lineHeight: 1.1,
          }}
        >
          Stranica nije<br />pronađena
        </h1>
        <p
          style={{
            color: "#666",
            maxWidth: "360px",
            marginBottom: "2.5rem",
            lineHeight: 1.6,
          }}
        >
          Tražena stranica ne postoji ili je premeštena. Pronađite sve kolekcije u našem web shopu.
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/web-shop"
            style={{
              display: "inline-block",
              padding: "0.75rem 2rem",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              textDecoration: "none",
              fontSize: "0.8125rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Proizvodi
          </Link>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "0.75rem 2rem",
              border: "1px solid #1a1a1a",
              color: "#1a1a1a",
              textDecoration: "none",
              fontSize: "0.8125rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Početna
          </Link>
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}

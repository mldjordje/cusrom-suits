import { Suspense, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Marcellus, Inter_Tight } from "next/font/google";
import AnalyticsScripts from "@/app/components/analytics/AnalyticsScripts";

// Deliberately imports NONE of the storefront stylesheets. The landing is a
// closed system: one module stylesheet, two fonts, no Bootstrap, no Uomo
// template, no `.ss-lux` cascade. Anything it needs, it declares itself.
import styles from "./landing.module.scss";

const marcellus = Marcellus({
  variable: "--lx-display",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--lx-sans",
  subsets: ["latin"],
  display: "swap",
});

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${marcellus.variable} ${interTight.variable} ${styles.root}`}>
      {children}
      <Suspense fallback={null}>
        <AnalyticsScripts />
      </Suspense>
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

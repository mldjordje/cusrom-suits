"use client";

import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";
import { usePathname } from "next/navigation";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

export default function AppMotionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { reduceMotion } = useAnimationBudget();

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
        <div className="ss-app-shell">
          <div className="ss-app-shell__glow ss-app-shell__glow--one" aria-hidden="true" />
          <div className="ss-app-shell__glow ss-app-shell__glow--two" aria-hidden="true" />

          <m.div
            key={pathname || "/"}
            className="ss-page-motion"
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.995 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </m.div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

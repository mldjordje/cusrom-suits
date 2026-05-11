"use client";

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

export default function AppMotionShell({ children }: { children: React.ReactNode }) {
  const { reduceMotion } = useAnimationBudget();

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
        <div className="ss-app-shell">
          <div className="ss-page-motion">{children}</div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

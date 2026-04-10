"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

type ConnectionLike = {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorWithHardwareHints = Navigator & {
  deviceMemory?: number;
  connection?: ConnectionLike;
  mozConnection?: ConnectionLike;
  webkitConnection?: ConnectionLike;
};

const readConnection = (): ConnectionLike | null => {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as NavigatorWithHardwareHints;
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
};

/**
 * Only skip motion for accessibility / data-saver / very slow networks.
 * Mobile-first UX still uses scroll reveals; we do not treat phones as "low power"
 * for animation (that previously disabled all storefront motion).
 */
const shouldForceReduceMotion = () => {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;

  const connection = readConnection();
  const effectiveType = String(connection?.effectiveType || "").toLowerCase();
  const saveData = Boolean(connection?.saveData);
  const weakNetwork = effectiveType.includes("2g") || effectiveType.includes("slow-2g");
  const nav = navigator as NavigatorWithHardwareHints;
  const weakMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 2;
  const weakCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2;

  return saveData || weakNetwork || weakMemory || weakCpu;
};

export default function useAnimationBudget() {
  const prefersReducedMotion = useReducedMotion();
  const [networkConstrained, setNetworkConstrained] = useState(() => shouldForceReduceMotion());

  useEffect(() => {
    setNetworkConstrained(shouldForceReduceMotion());
    const connection = readConnection();
    if (!connection || typeof (connection as EventTarget).addEventListener !== "function") return;

    const onConnectionChange = () => setNetworkConstrained(shouldForceReduceMotion());
    (connection as EventTarget).addEventListener("change", onConnectionChange);
    return () => {
      (connection as EventTarget).removeEventListener("change", onConnectionChange);
    };
  }, []);

  const reduceMotion = Boolean(prefersReducedMotion || networkConstrained);

  return useMemo(
    () => ({
      reduceMotion,
      /** @deprecated use reduceMotion; kept for callers that checked "lowPower" */
      lowPower: networkConstrained,
      allowParallax: !reduceMotion,
      allowTransitions: !reduceMotion,
    }),
    [networkConstrained, reduceMotion],
  );
}

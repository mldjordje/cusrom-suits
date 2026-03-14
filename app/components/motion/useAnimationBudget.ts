"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

type ConnectionLike = {
  saveData?: boolean;
  effectiveType?: string;
};

const readConnection = (): ConnectionLike | null => {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & {
    connection?: ConnectionLike;
    mozConnection?: ConnectionLike;
    webkitConnection?: ConnectionLike;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
};

const isLowPowerDevice = () => {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  const deviceMemory = Number(nav.deviceMemory || 8);
  const cpuCores = Number(nav.hardwareConcurrency || 8);
  const connection = readConnection();
  const effectiveType = String(connection?.effectiveType || "").toLowerCase();
  const saveData = Boolean(connection?.saveData);
  const weakNetwork = effectiveType.includes("2g") || effectiveType.includes("slow-2g");
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const compactViewport = window.matchMedia("(max-width: 820px)").matches;
  const appleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return saveData || weakNetwork || deviceMemory <= 4 || cpuCores <= 4 || coarsePointer || compactViewport || appleMobile;
};

export default function useAnimationBudget() {
  const prefersReducedMotion = useReducedMotion();
  const [lowPower, setLowPower] = useState(() => isLowPowerDevice());

  useEffect(() => {
    setLowPower(isLowPowerDevice());
    const connection = readConnection();
    if (!connection || typeof (connection as EventTarget).addEventListener !== "function") return;

    const onConnectionChange = () => setLowPower(isLowPowerDevice());
    (connection as EventTarget).addEventListener("change", onConnectionChange);
    return () => {
      (connection as EventTarget).removeEventListener("change", onConnectionChange);
    };
  }, []);

  const reduceMotion = Boolean(prefersReducedMotion || lowPower);

  return useMemo(
    () => ({
      reduceMotion,
      lowPower,
      allowParallax: !reduceMotion,
      allowTransitions: !reduceMotion,
    }),
    [lowPower, reduceMotion],
  );
}

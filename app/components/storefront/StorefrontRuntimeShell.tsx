"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import StorefrontPreloader from "@/app/components/storefront/StorefrontPreloader";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";

const StorefrontViewportEffects = dynamic(
  () => import("@/app/components/storefront/StorefrontViewportEffects"),
  { ssr: false },
);

const StorefrontCartDrawer = dynamic(
  () => import("@/app/components/storefront/cart/StorefrontCartDrawer"),
  { ssr: false },
);

const StorefrontMobileShopNav = dynamic(
  () => import("@/app/components/storefront/StorefrontMobileShopNav"),
  { ssr: false },
);

const StorefrontSearchOverlay = dynamic(
  () => import("@/app/components/storefront/StorefrontSearchOverlay"),
  { ssr: false },
);

const OPEN_SEARCH_EVENT = "ss:open-storefront-search";

export default function StorefrontRuntimeShell() {
  const pathname = usePathname() || "";
  const { isDrawerOpen, itemCount } = useCart();
  const [searchActivated, setSearchActivated] = useState(false);
  const [cartActivated, setCartActivated] = useState(false);
  const [replaySearchOpen, setReplaySearchOpen] = useState(false);
  const [showPreloader, setShowPreloader] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") {
      setShowPreloader(false);
      return;
    }

    const sessionKey = "ss-home-preloader-seen-v2";
    const alreadySeen = window.sessionStorage.getItem(sessionKey) === "1";
    if (alreadySeen) {
      setShowPreloader(false);
      return;
    }

    setShowPreloader(true);
  }, [pathname]);

  useEffect(() => {
    if (isDrawerOpen || itemCount > 0) {
      setCartActivated(true);
    }
  }, [isDrawerOpen, itemCount]);

  useEffect(() => {
    if (searchActivated) return;

    const activateSearch = () => {
      setSearchActivated(true);
      setReplaySearchOpen(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        activateSearch();
      }
    };

    window.addEventListener(OPEN_SEARCH_EVENT, activateSearch);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, activateSearch);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchActivated]);

  useEffect(() => {
    if (!searchActivated || !replaySearchOpen) return;

    const timer = window.setTimeout(() => {
      setReplaySearchOpen(false);
      window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [replaySearchOpen, searchActivated]);

  return (
    <>
      {showPreloader ? (
        <StorefrontPreloader
          onExitComplete={() => {
            window.sessionStorage.setItem("ss-home-preloader-seen-v2", "1");
            setShowPreloader(false);
          }}
        />
      ) : null}
      <StorefrontViewportEffects />
      {cartActivated ? <StorefrontCartDrawer /> : null}
      {searchActivated ? <StorefrontSearchOverlay /> : null}
      <StorefrontMobileShopNav />
    </>
  );
}

"use client";

import { useState } from "react";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";
import type { StorefrontCartItem } from "@/lib/cart/types";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export default function AddToCartButton({
  item,
  className,
  lang = "sr",
}: {
  item: Omit<StorefrontCartItem, "quantity">;
  className?: string;
  lang?: StorefrontLanguage;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const isEn = lang === "en";

  const handleClick = () => {
    addItem(item, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <button type="button" onClick={handleClick} className={className || "btn btn-primary btn-addtocart"}>
      {added ? (isEn ? "Added to cart" : "Dodato u korpu") : (isEn ? "Add to cart" : "Dodaj u korpu")}
    </button>
  );
}

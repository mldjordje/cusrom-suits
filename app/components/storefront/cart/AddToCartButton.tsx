"use client";

import { useState } from "react";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";
import type { StorefrontCartItem } from "@/lib/cart/types";

export default function AddToCartButton({
  item,
  className,
}: {
  item: Omit<StorefrontCartItem, "quantity">;
  className?: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    addItem(item, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <button type="button" onClick={handleClick} className={className || "btn btn-primary btn-addtocart"}>
      {added ? "Dodato u korpu" : "Dodaj u korpu"}
    </button>
  );
}


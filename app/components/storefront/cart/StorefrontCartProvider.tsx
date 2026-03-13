"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { StorefrontCartItem } from "@/lib/cart/types";

type CartContextValue = {
  items: StorefrontCartItem[];
  itemCount: number;
  subtotal: number;
  isReady: boolean;
  addItem: (item: Omit<StorefrontCartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (legacyId: number, quantity: number) => void;
  removeItem: (legacyId: number) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "santos_webshop_cart_v1";

const CartContext = createContext<CartContextValue | null>(null);

const clampQuantity = (quantity: number, maxQuantity: number | null) => {
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  if (maxQuantity == null || maxQuantity <= 0) return safeQuantity;
  return Math.min(safeQuantity, maxQuantity);
};

export default function StorefrontCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StorefrontCartItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setIsReady(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setIsReady(true);
        return;
      }
      setItems(
        parsed
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const row = entry as StorefrontCartItem;
            const legacyId = Number(row.legacyId);
            if (!Number.isFinite(legacyId) || legacyId <= 0) return null;
            return {
              legacyId,
              sku: String(row.sku || ""),
              name: String(row.name || ""),
              price: Number(row.price || 0),
              image: row.image ? String(row.image) : null,
              quantity: clampQuantity(Number(row.quantity || 1), row.maxQuantity ?? null),
              maxQuantity: row.maxQuantity == null ? null : Number(row.maxQuantity),
              categoryLabel: row.categoryLabel ? String(row.categoryLabel) : null,
            };
          })
          .filter((item): item is StorefrontCartItem => Boolean(item)),
      );
    } catch {
      setItems([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [isReady, items]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
      items,
      itemCount,
      subtotal,
      isReady,
      addItem: (item, quantity = 1) => {
        setItems((current) => {
          const nextQuantity = clampQuantity(quantity, item.maxQuantity);
          const existingIndex = current.findIndex((entry) => entry.legacyId === item.legacyId);
          if (existingIndex === -1) {
            return [...current, { ...item, quantity: nextQuantity }];
          }
          return current.map((entry, index) =>
            index !== existingIndex
              ? entry
              : {
                  ...entry,
                  quantity: clampQuantity(entry.quantity + nextQuantity, entry.maxQuantity),
                },
          );
        });
      },
      updateQuantity: (legacyId, quantity) => {
        setItems((current) =>
          current
            .map((entry) =>
              entry.legacyId === legacyId
                ? { ...entry, quantity: clampQuantity(quantity, entry.maxQuantity) }
                : entry,
            )
            .filter((entry) => entry.quantity > 0),
        );
      },
      removeItem: (legacyId) => {
        setItems((current) => current.filter((entry) => entry.legacyId !== legacyId));
      },
      clearCart: () => {
        setItems([]);
      },
    };
  }, [isReady, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside StorefrontCartProvider");
  }
  return context;
}


"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProductSizeOption = {
  legacyId: number;
  label: string;
  inStock: boolean;
  href: string;
};

export default function ProductSizePicker({
  options,
  currentLegacyId,
}: {
  options: ProductSizeOption[];
  currentLegacyId: number;
}) {
  const router = useRouter();
  const [pendingLegacyId, setPendingLegacyId] = useState<number | null>(null);

  useEffect(() => {
    setPendingLegacyId(null);
  }, [currentLegacyId]);

  return (
    <div className="swatch-list d-flex flex-wrap gap-2 ss-product-size-picker">
      {options.map((option) => {
        const isActive = option.legacyId === currentLegacyId;
        const isPending = pendingLegacyId === option.legacyId;
        const isDisabled = !option.inStock;

        return (
          <button
            key={`${option.label}-${option.legacyId}`}
            type="button"
            className={[
              "swatch",
              "text-uppercase",
              "ss-size-swatch",
              isActive ? "is-active" : "",
              option.inStock ? "" : "is-oos",
              isPending ? "is-pending" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => {
              if (isActive || isDisabled) return;
              setPendingLegacyId(option.legacyId);
              startTransition(() => {
                router.replace(option.href, { scroll: false });
              });
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

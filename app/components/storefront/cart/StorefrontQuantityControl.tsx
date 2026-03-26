"use client";

type StorefrontQuantityControlProps = {
  value: number;
  min?: number;
  max?: number | null;
  onChange: (value: number) => void;
  decreaseLabel?: string;
  increaseLabel?: string;
  className?: string;
  inputClassName?: string;
};

export default function StorefrontQuantityControl({
  value,
  min = 1,
  max = null,
  onChange,
  decreaseLabel = "Smanji kolicinu",
  increaseLabel = "Povecaj kolicinu",
  className = "",
  inputClassName = "",
}: StorefrontQuantityControlProps) {
  const lowerBound = Math.max(1, Math.floor(Number(min) || 1));
  const upperBound = max != null && max > 0 ? Math.floor(max) : null;
  const safeValue = Math.max(lowerBound, Math.floor(Number(value) || lowerBound));
  const canDecrease = safeValue > lowerBound;
  const canIncrease = upperBound == null || safeValue < upperBound;

  const applyValue = (nextValue: number) => {
    const normalized = Math.max(lowerBound, Math.floor(Number(nextValue) || lowerBound));
    onChange(upperBound == null ? normalized : Math.min(normalized, upperBound));
  };

  return (
    <div className={`ss-quantity-control ${className}`.trim()}>
      <button
        type="button"
        className="ss-quantity-control__button"
        onClick={() => applyValue(safeValue - 1)}
        aria-label={decreaseLabel}
        disabled={!canDecrease}
      >
        <span aria-hidden="true">-</span>
      </button>

      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min={lowerBound}
        max={upperBound ?? undefined}
        value={safeValue}
        onChange={(event) => applyValue(Number(event.target.value))}
        className={`ss-quantity-control__input ${inputClassName}`.trim()}
      />

      <button
        type="button"
        className="ss-quantity-control__button"
        onClick={() => applyValue(safeValue + 1)}
        aria-label={increaseLabel}
        disabled={!canIncrease}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}

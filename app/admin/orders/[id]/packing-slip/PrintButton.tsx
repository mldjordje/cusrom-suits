"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
    >
      Stampaj
    </button>
  );
}

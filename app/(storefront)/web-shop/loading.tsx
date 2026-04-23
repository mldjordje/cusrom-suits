export default function WebShopLoading() {
  return (
    <div className="container py-5" aria-busy="true" aria-live="polite">
      <div className="ss-shop-skeleton" style={{ display: "grid", gap: "2rem" }}>
        <div
          style={{
            height: "clamp(220px, 34vw, 360px)",
            borderRadius: "20px",
            background: "linear-gradient(90deg, #f0efed 0%, #f7f6f3 50%, #f0efed 100%)",
            backgroundSize: "200% 100%",
            animation: "ss-skeleton-shimmer 1.4s ease-in-out infinite",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div
                style={{
                  aspectRatio: "3/4",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(90deg, #efeeeb 0%, #f7f6f3 50%, #efeeeb 100%)",
                  backgroundSize: "200% 100%",
                  animation: "ss-skeleton-shimmer 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.06}s`,
                }}
              />
              <div
                style={{
                  height: "14px",
                  width: "70%",
                  borderRadius: "6px",
                  background: "#efeeeb",
                }}
              />
              <div
                style={{
                  height: "12px",
                  width: "40%",
                  borderRadius: "6px",
                  background: "#efeeeb",
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes ss-skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

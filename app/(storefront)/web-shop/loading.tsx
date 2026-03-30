export default function WebShopLoading() {
  return (
    <div className="container py-5" aria-busy="true" aria-live="polite">
      <div
        className="rounded-3 bg-body-secondary bg-opacity-10"
        style={{ minHeight: "42vh" }}
      />
    </div>
  );
}

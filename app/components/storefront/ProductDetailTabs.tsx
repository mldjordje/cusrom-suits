"use client";

import { useMemo, useState } from "react";

type Props = {
  description: string | null;
  specification: string | null;
  attributes: Array<[string, unknown]>;
};

type TabKey = "description" | "additional" | "reviews";

const safeHtml = (value: string | null) => ({
  __html: value && value.trim().length > 0 ? value : "<p>No detailed description available.</p>",
});

export default function ProductDetailTabs({ description, specification, attributes }: Props) {
  const [tab, setTab] = useState<TabKey>("description");

  const additionalItems = useMemo(() => attributes.slice(0, 8), [attributes]);

  return (
    <div className="product-single__details-tab">
      <ul className="nav nav-tabs" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link nav-link_underscore ${tab === "description" ? "active" : ""}`}
            onClick={() => setTab("description")}
          >
            Description
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link nav-link_underscore ${tab === "additional" ? "active" : ""}`}
            onClick={() => setTab("additional")}
          >
            Additional Information
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link nav-link_underscore ${tab === "reviews" ? "active" : ""}`}
            onClick={() => setTab("reviews")}
          >
            Reviews (0)
          </button>
        </li>
      </ul>

      <div className="tab-content">
        {tab === "description" ? (
          <div className="tab-pane fade show active">
            <div className="product-single__description">
              <h3 className="block-title mb-4">Sed do eiusmod tempor incididunt ut labore</h3>
              <div className="content" dangerouslySetInnerHTML={safeHtml(description)} />
              <h3 className="block-title mb-0">Specification</h3>
              <div className="content" dangerouslySetInnerHTML={safeHtml(specification)} />
            </div>
          </div>
        ) : null}

        {tab === "additional" ? (
          <div className="tab-pane fade show active">
            <div className="product-single__description">
              <h3 className="block-title mb-3">Additional Information</h3>
              {additionalItems.length > 0 ? (
                <ul className="list text-list">
                  {additionalItems.map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {String(value)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No additional attributes available.</p>
              )}
            </div>
          </div>
        ) : null}

        {tab === "reviews" ? (
          <div className="tab-pane fade show active">
            <div className="product-single__description">
              <h3 className="block-title mb-3">Reviews</h3>
              <p>No reviews yet for this item.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

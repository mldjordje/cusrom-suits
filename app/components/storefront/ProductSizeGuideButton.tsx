"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import type { ProductSizeGuide } from "@/lib/storefront/product-details";

type Props = {
  lang?: StorefrontLanguage;
  sizeGuide: ProductSizeGuide | null;
};

export default function ProductSizeGuideButton({
  lang = "sr",
  sizeGuide,
}: Props) {
  const [open, setOpen] = useState(false);
  const isEn = lang === "en";

  if (!sizeGuide) return null;

  return (
    <>
      <button
        type="button"
        className="ss-size-guide-trigger"
        onClick={() => setOpen(true)}
      >
        {sizeGuide.buttonLabel}
      </button>

      <Transition show={open} as={Fragment}>
        <Dialog as="div" className="ss-size-guide-modal" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="ss-size-guide-modal__backdrop" />
          </Transition.Child>

          <div className="ss-size-guide-modal__viewport">
            <div className="ss-size-guide-modal__scroll">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-3 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-3 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="ss-size-guide-modal__panel">
                  <div className="ss-size-guide-modal__header">
                    <div>
                      <p className="ss-size-guide-modal__eyebrow">
                        {isEn ? "Fit helper" : "Pomoc za fit"}
                      </p>
                      <Dialog.Title className="ss-size-guide-modal__title">
                        {sizeGuide.modalTitle}
                      </Dialog.Title>
                    </div>
                    <button
                      type="button"
                      className="ss-size-guide-modal__close"
                      onClick={() => setOpen(false)}
                      aria-label={isEn ? "Close size guide" : "Zatvori tabelu velicina"}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="ss-size-guide-modal__body">
                    <div className="ss-size-guide-modal__intro">
                      <h3>{sizeGuide.title}</h3>
                      <p>{sizeGuide.intro}</p>
                    </div>

                    {sizeGuide.bullets.length ? (
                      <ul className="ss-size-guide-modal__bullets">
                        {sizeGuide.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}

                    {sizeGuide.fallbackNote ? (
                      <div className="ss-size-guide-modal__empty">
                        <p>{sizeGuide.fallbackNote}</p>
                      </div>
                    ) : null}

                    {sizeGuide.tables.map((table) => (
                      <section key={table.id} className="ss-size-guide-table-card">
                        <div className="ss-size-guide-table-card__head">
                          <h4>{table.title}</h4>
                          <span className="ss-size-guide-table-card__fit">
                            {table.fit === "standard" ? (isEn ? "Standard" : "Standard") : table.fit}
                          </span>
                        </div>

                        {table.notes.length ? (
                          <div className="ss-size-guide-table-card__notes">
                            {table.notes.map((note) => (
                              <span key={note}>{note}</span>
                            ))}
                          </div>
                        ) : null}

                        <div className="ss-size-guide-table-card__table-wrap">
                          <table className="ss-size-guide-table">
                            <thead>
                              <tr>
                                {table.headers.map((header) => (
                                  <th key={header}>{header}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row) => (
                                <tr key={row.id}>
                                  {row.cells.map((cell, index) => (
                                    <td key={`${row.id}-${index}`}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ))}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

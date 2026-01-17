"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

export type FabricDetail = {
  name?: string;
  code?: string | null;
  texture?: string | null;
  detailImage?: string | null;
  detailText?: string | null;
};

type Props = {
  fabric: FabricDetail | null;
  onClose: () => void;
};

const resolveDetailImage = (fabric?: FabricDetail | null) =>
  (fabric?.detailImage || fabric?.texture || "") as string;

const resolveDetailText = (fabric?: FabricDetail | null) => (fabric?.detailText || "").trim();

export default function FabricDetailModal({ fabric, onClose }: Props) {
  const isOpen = Boolean(fabric);
  const detailImage = resolveDetailImage(fabric);
  const detailText = resolveDetailText(fabric);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[80]">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-left shadow-2xl">
                <div className="relative aspect-[5/3] w-full bg-gray-100">
                  {detailImage ? (
                    <img
                      src={detailImage}
                      alt={fabric?.name || "Fabric detail"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      No detail image
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                </div>
                <div className="space-y-2 px-5 py-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">Detalji tkanine</Dialog.Title>
                  {fabric?.name && <p className="text-sm font-semibold text-gray-900">{fabric.name}</p>}
                  {fabric?.code && <p className="text-xs text-gray-500">Sifra: {fabric.code}</p>}
                  {detailText ? (
                    <p className="whitespace-pre-line text-sm text-gray-600">{detailText}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Nema opisa za ovu tkaninu.</p>
                  )}
                </div>
                <div className="flex justify-end border-t border-gray-100 px-5 py-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800"
                  >
                    Zatvori
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

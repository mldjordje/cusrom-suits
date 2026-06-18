"use client";

import { useEffect, useRef, useState } from "react";
import type { PopupSettings } from "@/lib/marketing/popupSettings";

type UploadState = "idle" | "uploading" | "done" | "error";

function UploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");

  const handleFile = async (file: File) => {
    setState("uploading");
    try {
      const form = new FormData();
      form.append("files", file);
      const res = await fetch("/api/admin/webshop/site-assets", { method: "POST", body: form });
      const json = await res.json();
      if (!json?.success || !json?.urls?.[0]) throw new Error(json?.message || "Upload nije uspeo");
      onUploaded(json.urls[0] as string);
      setState("done");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "uploading"}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {state === "uploading" ? "Uploaduje se…" : state === "done" ? "✓ Uploadovano" : state === "error" ? "Greška — pokušaj opet" : "Upload sliku"}
      </button>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-semibold text-slate-700">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      )}
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-slate-800" />
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </label>
  );
}

export default function AdminPopupsPage() {
  const [settings, setSettings] = useState<PopupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/popup-settings");
        const json = await res.json();
        if (json?.success) setSettings(json.settings as PopupSettings);
        else setError(json?.message || "Učitavanje nije uspelo");
      } catch {
        setError("Greška pri učitavanju");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/popup-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Čuvanje nije uspelo");
        return;
      }
      setSettings(json.settings as PopupSettings);
      setNotice("Sačuvano!");
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setError("Greška pri čuvanju");
    } finally {
      setSaving(false);
    }
  };

  const patchModal = (p: Partial<PopupSettings["modal"]>) =>
    setSettings((s) => (s ? { ...s, modal: { ...s.modal, ...p } } : s));
  const patchToast = (p: Partial<PopupSettings["toast"]>) =>
    setSettings((s) => (s ? { ...s, toast: { ...s.toast, ...p } } : s));

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Pop-up i promo poruke</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Veliki modal (slika + prijava) i mali toast dole-desno. Prikazuju se jednom po poseti.
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !settings}
            className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Čuvanje…" : "Sačuvaj"}
          </button>
        </div>
        {notice && <div className="mt-3 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 border border-green-200">{notice}</div>}
        {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 border border-red-200">{error}</div>}
      </div>

      {loading || !settings ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Učitavanje…</div>
      ) : (
        <>
          {/* MODAL */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Veliki modal (centar)</h2>
              <Toggle label="Uključen" value={settings.modal.enabled} onChange={(v) => patchModal({ enabled: v })} />
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-semibold text-slate-700">Slika</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <input
                  type="text"
                  value={settings.modal.image}
                  onChange={(e) => patchModal({ image: e.target.value })}
                  placeholder="/site-assets/..."
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <UploadButton onUploaded={(url) => patchModal({ image: url })} />
              </div>
              {settings.modal.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={settings.modal.image} alt="" className="h-40 w-auto rounded-xl border border-slate-200 object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
              )}
            </div>

            <Field label="Naslov" value={settings.modal.heading} onChange={(v) => patchModal({ heading: v })} placeholder="POKLANJAMO" />
            <Field label="Tekst" value={settings.modal.description} onChange={(v) => patchModal({ description: v })} textarea />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Link tekst (opciono)" value={settings.modal.linkLabel} onChange={(v) => patchModal({ linkLabel: v })} placeholder="OVDE" />
              <Field label="Link adresa" value={settings.modal.linkHref} onChange={(v) => patchModal({ linkHref: v })} placeholder="/kontakt" />
            </div>
            <Toggle label="Prikaži formu za prijavu (ime, prezime, mejl, datum, pol)" value={settings.modal.collectForm} onChange={(v) => patchModal({ collectForm: v })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tekst dugmeta" value={settings.modal.submitLabel} onChange={(v) => patchModal({ submitLabel: v })} placeholder="PRIJAVITE SE" />
              <Field label="Poruka posle prijave" value={settings.modal.successMessage} onChange={(v) => patchModal({ successMessage: v })} />
            </div>
            <p className="text-xs text-slate-500">Prijave se čuvaju u Newsletter listi (Podrška → Newsletter).</p>
          </div>

          {/* TOAST */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Mali toast (dole-desno)</h2>
              <Toggle label="Uključen" value={settings.toast.enabled} onChange={(v) => patchToast({ enabled: v })} />
            </div>
            <Field label="Tekst" value={settings.toast.text} onChange={(v) => patchToast({ text: v })} textarea />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Link tekst" value={settings.toast.linkLabel} onChange={(v) => patchToast({ linkLabel: v })} placeholder="link" />
              <Field label="Link adresa" value={settings.toast.linkHref} onChange={(v) => patchToast({ linkHref: v })} placeholder="/akcije" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { PopupSettings } from "@/lib/marketing/popupSettings";

const MODAL_SEEN_KEY = "santos_popup_modal_seen";
const TOAST_SEEN_KEY = "santos_popup_toast_seen";
const MODAL_DELAY_MS = 1200;

type FormState = "idle" | "loading" | "success" | "error";

export default function PromoPopups({ settings }: { settings: PopupSettings }) {
  const { modal, toast } = settings;
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", birthDate: "", gender: "" });
  const [formState, setFormState] = useState<FormState>("idle");
  const [formMessage, setFormMessage] = useState("");

  // Show once per browser session (sessionStorage clears when the tab closes).
  useEffect(() => {
    if (!modal.enabled) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(MODAL_SEEN_KEY)) return;
    const t = setTimeout(() => setShowModal(true), MODAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [modal.enabled]);

  useEffect(() => {
    if (!toast.enabled) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(TOAST_SEEN_KEY)) return;
    const t = setTimeout(() => setShowToast(true), MODAL_DELAY_MS + 400);
    return () => clearTimeout(t);
  }, [toast.enabled]);

  const closeModal = () => {
    setShowModal(false);
    try {
      sessionStorage.setItem(MODAL_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const closeToast = () => {
    setShowToast(false);
    try {
      sessionStorage.setItem(TOAST_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formState === "loading") return;
    setFormState("loading");
    setFormMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "promo-popup" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setFormState("error");
        setFormMessage(json?.message || "Došlo je do greške. Pokušajte ponovo.");
        return;
      }
      setFormState("success");
      setFormMessage(modal.successMessage || "Hvala! Uspešno ste se prijavili.");
    } catch {
      setFormState("error");
      setFormMessage("Došlo je do greške. Pokušajte ponovo.");
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  if (!modal.enabled && !toast.enabled) return null;

  return (
    <>
      <style>{`
        .santos-pop-overlay{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;background:rgba(20,20,20,.5);padding:16px;}
        .santos-pop-modal{position:relative;display:flex;width:100%;max-width:920px;max-height:92vh;overflow:hidden;background:#fff;border-radius:4px;box-shadow:0 24px 70px rgba(0,0,0,.35);}
        .santos-pop-img{flex:1 1 48%;background-size:cover;background-position:center;min-height:320px;}
        .santos-pop-body{flex:1 1 52%;padding:40px 40px 36px;overflow-y:auto;}
        .santos-pop-close{position:absolute;top:14px;right:16px;border:0;background:transparent;font-size:26px;line-height:1;cursor:pointer;color:#222;z-index:2;}
        .santos-pop-h{font-size:30px;font-weight:700;letter-spacing:.04em;margin:0 0 14px;color:#111;}
        .santos-pop-desc{font-size:14px;line-height:1.6;color:#333;margin:0 0 20px;}
        .santos-pop-desc a{color:#1a66ff;text-decoration:underline;}
        .santos-pop-field{width:100%;border:1px solid #cfcfcf;border-radius:4px;padding:13px 14px;font-size:14px;margin-bottom:12px;background:#fff;color:#111;}
        .santos-pop-row{display:flex;gap:12px;}
        .santos-pop-row .santos-pop-field{flex:1;}
        .santos-pop-submit{width:100%;border:0;border-radius:4px;background:#111;color:#fff;font-weight:700;letter-spacing:.05em;padding:15px;font-size:14px;cursor:pointer;margin-top:4px;}
        .santos-pop-submit:disabled{opacity:.6;cursor:default;}
        .santos-pop-msg{margin:12px 0 0;font-size:13px;}
        .santos-pop-toast{position:fixed;right:18px;bottom:18px;z-index:1190;max-width:330px;background:#fff;border:1px solid #e2e2e2;border-radius:8px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:16px 34px 16px 16px;font-size:13px;line-height:1.55;color:#222;}
        .santos-pop-toast a{color:#1f9d57;text-decoration:underline;}
        .santos-pop-toast-close{position:absolute;top:8px;right:10px;border:0;background:transparent;font-size:18px;line-height:1;cursor:pointer;color:#888;}
        @media (max-width:640px){.santos-pop-img{display:none;}.santos-pop-body{padding:46px 22px 26px;}.santos-pop-h{font-size:24px;}}
      `}</style>

      {showModal && modal.enabled && (
        <div className="santos-pop-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="santos-pop-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="santos-pop-close" aria-label="Zatvori" onClick={closeModal}>
              ✕
            </button>
            {modal.image ? (
              <div className="santos-pop-img" style={{ backgroundImage: `url(${modal.image})` }} aria-hidden />
            ) : null}
            <div className="santos-pop-body">
              <h2 className="santos-pop-h">{modal.heading}</h2>
              <p className="santos-pop-desc">
                {modal.description}
                {modal.linkLabel && modal.linkHref ? (
                  <>
                    {" "}
                    <a href={modal.linkHref}>{modal.linkLabel}</a>
                  </>
                ) : null}
              </p>

              {modal.collectForm && formState !== "success" ? (
                <form onSubmit={submit}>
                  <div className="santos-pop-row">
                    <input className="santos-pop-field" placeholder="Ime" value={form.firstName} onChange={set("firstName")} />
                    <input className="santos-pop-field" placeholder="Prezime" value={form.lastName} onChange={set("lastName")} />
                  </div>
                  <input className="santos-pop-field" type="email" required placeholder="Mejl" value={form.email} onChange={set("email")} />
                  <input
                    className="santos-pop-field"
                    type="text"
                    placeholder="Datum rođenja"
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                    value={form.birthDate}
                    onChange={set("birthDate")}
                  />
                  <select className="santos-pop-field" value={form.gender} onChange={set("gender")}>
                    <option value="">Pol</option>
                    <option value="muski">Muški</option>
                    <option value="zenski">Ženski</option>
                    <option value="drugo">Drugo</option>
                  </select>
                  <button type="submit" className="santos-pop-submit" disabled={formState === "loading"}>
                    {formState === "loading" ? "..." : modal.submitLabel}
                  </button>
                  {formMessage ? (
                    <p className="santos-pop-msg" style={{ color: formState === "error" ? "#c0392b" : "#1f9d57" }}>
                      {formMessage}
                    </p>
                  ) : null}
                </form>
              ) : null}

              {formState === "success" ? (
                <p className="santos-pop-msg" style={{ color: "#1f9d57", fontSize: 15 }}>
                  {formMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showToast && toast.enabled && (
        <div className="santos-pop-toast" role="status">
          <button type="button" className="santos-pop-toast-close" aria-label="Zatvori" onClick={closeToast}>
            ✕
          </button>
          <span>
            {toast.text}
            {toast.linkLabel && toast.linkHref ? (
              <>
                {" "}
                <a href={toast.linkHref}>{toast.linkLabel}</a>
              </>
            ) : null}
          </span>
        </div>
      )}
    </>
  );
}

"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import AccountNav from "@/app/components/storefront/account/AccountNav";
import { makeWithLang } from "@/app/components/storefront/account/accountShared";
import {
  EMPTY_STOREFRONT_PROFILE,
  getProfileCompleteness,
  readStorefrontProfile,
  toStorefrontProfileMetadata,
  type StorefrontProfile,
} from "@/lib/storefront/accountProfile";
import type { StorefrontLanguage } from "@/lib/storefront/language";

type FieldKey = Exclude<keyof StorefrontProfile, "marketingOptIn">;

const FIELDS: Array<{
  key: FieldKey;
  label: [string, string];
  placeholder: [string, string];
  type: string;
  autoComplete: string;
  /** Address takes the full row; the rest sit two to a row on desktop. */
  wide?: boolean;
}> = [
  {
    key: "fullName",
    label: ["Ime i prezime", "Full name"],
    placeholder: ["Marko Markovic", "John Smith"],
    type: "text",
    autoComplete: "name",
  },
  {
    key: "phone",
    label: ["Telefon", "Phone"],
    placeholder: ["06x xxx xxxx", "06x xxx xxxx"],
    type: "tel",
    autoComplete: "tel",
  },
  {
    key: "address",
    label: ["Adresa i broj", "Street address"],
    placeholder: ["Ulica i broj", "Street and number"],
    type: "text",
    autoComplete: "street-address",
    wide: true,
  },
  {
    key: "city",
    label: ["Grad", "City"],
    placeholder: ["Beograd", "Belgrade"],
    type: "text",
    autoComplete: "address-level2",
  },
  {
    key: "postalCode",
    label: ["Postanski broj", "Postal code"],
    placeholder: ["11000", "11000"],
    type: "text",
    autoComplete: "postal-code",
  },
];

export default function ProfileForm({ lang }: { lang: StorefrontLanguage }) {
  const isEn = lang === "en";
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useStorefrontAuth();
  const withLang = useMemo(() => makeWithLang(isEn), [isEn]);

  const [form, setForm] = useState<StorefrontProfile>(EMPTY_STOREFRONT_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(withLang(`/nalog/prijava?next=${encodeURIComponent("/nalog/profil")}`));
      return;
    }
    /* Only seed the inputs once. Supabase pushes a fresh user object on every
       token refresh, and re-seeding on each of those would wipe out whatever
       the customer had half-typed. */
    if (hydrated) return;
    setForm(readStorefrontProfile(user.user_metadata));
    setHydrated(true);
  }, [authLoading, user, router, withLang, hydrated]);

  const completeness = getProfileCompleteness(form);

  const setField = (key: keyof StorefrontProfile, value: string | boolean) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: toStorefrontProfileMetadata(form),
      });
      if (updateError) {
        setError(updateError.message || (isEn ? "Could not save." : "Cuvanje nije uspelo."));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(String((e as Error)?.message || (isEn ? "Could not save." : "Cuvanje nije uspelo.")));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return <p className="text-secondary">{isEn ? "Loading..." : "Ucitavanje..."}</p>;
  }

  return (
    <div className="ss-commerce-stack">
      <AccountNav isEn={isEn} withLang={withLang} />

      <div className="ss-order-panel">
        <div className="ss-order-panel__header">
          <div>
            <p className="ss-order-panel__eyebrow">{isEn ? "Profile" : "Profil"}</p>
            <h2>{isEn ? "Delivery details" : "Podaci za dostavu"}</h2>
          </div>
          <span className={`ss-account-progress ${completeness.isComplete ? "is-complete" : ""}`}>
            {completeness.filled}/{completeness.total}
          </span>
        </div>

        <p className="ss-order-panel__hint mt-0 mb-4">
          {isEn
            ? "Saved here once, filled in for you at every checkout. Nothing is shared outside your order."
            : "Sacuvaj jednom, pa se svaka naredna kupovina popuni sama. Podaci se ne dele van tvoje porudzbine."}
        </p>

        {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
        {saved ? (
          <div className="alert alert-success py-2 small">
            {isEn ? "Profile saved." : "Profil je sacuvan."}
          </div>
        ) : null}

        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label small text-uppercase fw-semibold" htmlFor="profile-email">
                {isEn ? "Email" : "Email"}
              </label>
              <input
                id="profile-email"
                type="email"
                className="form-control"
                value={user.email || ""}
                disabled
                readOnly
              />
              <p className="form-text">
                {isEn
                  ? "Your sign-in address. Orders placed with it are matched to this account automatically."
                  : "Adresa za prijavu. Porudzbine poslate sa nje automatski se vezuju za ovaj nalog."}
              </p>
            </div>

            {FIELDS.map((field) => (
              <div className={field.wide ? "col-12" : "col-12 col-md-6"} key={field.key}>
                <label className="form-label small text-uppercase fw-semibold" htmlFor={`profile-${field.key}`}>
                  {field.label[isEn ? 1 : 0]}
                </label>
                <input
                  id={`profile-${field.key}`}
                  type={field.type}
                  className="form-control"
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder[isEn ? 1 : 0]}
                  value={form[field.key]}
                  onChange={(event) => setField(field.key, event.target.value)}
                />
              </div>
            ))}

            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="profile-marketing"
                  checked={form.marketingOptIn}
                  onChange={(event) => setField("marketingOptIn", event.target.checked)}
                />
                <label className="form-check-label" htmlFor="profile-marketing">
                  {isEn
                    ? "Email me about new arrivals and sales"
                    : "Zelim email o novim modelima i akcijama"}
                </label>
              </div>
            </div>
          </div>

          <div className="ss-order-summary__actions">
            <button type="submit" className="btn btn-primary text-uppercase fw-medium" disabled={saving}>
              {saving ? (isEn ? "Saving..." : "Cuvam...") : isEn ? "Save profile" : "Sacuvaj profil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

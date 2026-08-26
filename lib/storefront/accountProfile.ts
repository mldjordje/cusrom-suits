/**
 * Customer profile, stored on the Supabase auth user's own `user_metadata`.
 *
 * There is no `profiles` table on purpose. The storefront only ever needs the
 * handful of fields below, every one of them belongs to exactly one user, and
 * `user_metadata` is already delivered with the session — so reading a profile
 * costs no round trip and writing one needs no table, no RLS policy and no
 * migration. If the profile ever grows fields other people may read (public
 * reviews, loyalty tiers), that is the moment for a real table.
 */

export type StorefrontProfile = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  marketingOptIn: boolean;
};

/** Keys as they are written on `user_metadata` — snake_case, like Supabase's own. */
export type StorefrontProfileMetadata = {
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  marketing_opt_in?: boolean;
};

export const EMPTY_STOREFRONT_PROFILE: StorefrontProfile = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  marketingOptIn: false,
};

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/**
 * Reads a profile out of raw `user_metadata`.
 *
 * Google sign-in fills `name` and `full_name` rather than our own keys, so both
 * are accepted for the name — otherwise a Google customer would land on a
 * profile form that had forgotten who they are.
 */
export const readStorefrontProfile = (metadata: unknown): StorefrontProfile => {
  const meta = (metadata && typeof metadata === "object" ? metadata : {}) as Record<string, unknown>;
  return {
    fullName: str(meta.full_name) || str(meta.name),
    phone: str(meta.phone),
    address: str(meta.address),
    city: str(meta.city),
    postalCode: str(meta.postal_code),
    marketingOptIn: meta.marketing_opt_in === true,
  };
};

/** Shapes a profile for `auth.updateUser({ data })`. */
export const toStorefrontProfileMetadata = (profile: StorefrontProfile): StorefrontProfileMetadata => ({
  full_name: profile.fullName.trim(),
  phone: profile.phone.trim(),
  address: profile.address.trim(),
  city: profile.city.trim(),
  postal_code: profile.postalCode.trim(),
  marketing_opt_in: profile.marketingOptIn === true,
});

/** The fields that make a delivery possible without asking again. */
const REQUIRED_FIELDS: Array<keyof StorefrontProfile> = [
  "fullName",
  "phone",
  "address",
  "city",
  "postalCode",
];

export type ProfileCompleteness = {
  filled: number;
  total: number;
  percent: number;
  missing: Array<keyof StorefrontProfile>;
  isComplete: boolean;
};

export const getProfileCompleteness = (profile: StorefrontProfile): ProfileCompleteness => {
  const missing = REQUIRED_FIELDS.filter((field) => !String(profile[field] || "").trim());
  const filled = REQUIRED_FIELDS.length - missing.length;
  return {
    filled,
    total: REQUIRED_FIELDS.length,
    percent: Math.round((filled / REQUIRED_FIELDS.length) * 100),
    missing,
    isComplete: missing.length === 0,
  };
};

export const PROFILE_FIELD_LABELS: Record<keyof StorefrontProfile, [string, string]> = {
  fullName: ["Ime i prezime", "Full name"],
  phone: ["Telefon", "Phone"],
  address: ["Adresa", "Address"],
  city: ["Grad", "City"],
  postalCode: ["Postanski broj", "Postal code"],
  marketingOptIn: ["Obavestenja o akcijama", "Promotion emails"],
};

export const profileFieldLabel = (field: keyof StorefrontProfile, isEn: boolean): string =>
  PROFILE_FIELD_LABELS[field][isEn ? 1 : 0];

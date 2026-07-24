import { revalidateTag, unstable_cache } from "next/cache";
import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";

const POPUP_SETTINGS_PATH = "data/popup-settings.json";
const POPUP_SETTINGS_CACHE_TAG = "popup-settings";

/** Big centre modal — promo + optional signup form (name/email/birth/gender). */
export type PopupModalSettings = {
  enabled: boolean;
  image: string;
  heading: string;
  description: string;
  /** Optional inline link rendered after the description (e.g. "OVDE"). */
  linkLabel: string;
  linkHref: string;
  /** When true the signup form (ime/prezime/mejl/datum/pol) is shown and stored. */
  collectForm: boolean;
  submitLabel: string;
  successMessage: string;
};

/** Small bottom-right toast — short promo text with one link. */
export type PopupToastSettings = {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkHref: string;
};

export type PopupSettings = {
  modal: PopupModalSettings;
  toast: PopupToastSettings;
};

const DEFAULT_SETTINGS: PopupSettings = {
  modal: {
    enabled: false,
    image: "",
    heading: "POKLANJAMO",
    description:
      "Promotivni kod od 5%. Sve što je potrebno da uradite jeste da se registrujete na naš sajt i prijavite na newsletter. Više informacija",
    linkLabel: "OVDE.",
    linkHref: "/kontakt",
    collectForm: true,
    submitLabel: "PRIJAVITE SE",
    successMessage: "Hvala! Uspešno ste se prijavili.",
  },
  toast: {
    enabled: false,
    text: "Popusti koje ste čekali su tu! Muška i ženska kolekcija proleće/leto '26 sada su snižene do čak 30%.",
    // Was the literal placeholder "link", which shipped to production and
    // rendered as "…snižene do čak 30%. link" on every page.
    linkLabel: "Pogledaj akcije",
    linkHref: "/akcije",
  },
};

const str = (v: unknown, fallback = "") => {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
};

/** Placeholder labels that leaked into stored settings and rendered verbatim to
 *  customers. Treated as "not set" so the real default takes over without
 *  anyone having to edit the saved JSON. */
const PLACEHOLDER_LINK_LABELS = new Set(["link", "label", "text", "lorem", "todo"]);

const linkLabel = (value: unknown, fallback = "") => {
  const text = str(value);
  return text && !PLACEHOLDER_LINK_LABELS.has(text.toLowerCase()) ? text : fallback;
};

export function normalizePopupSettings(value: Partial<PopupSettings> | null | undefined): PopupSettings {
  const modal = (value?.modal ?? {}) as Partial<PopupModalSettings>;
  const toast = (value?.toast ?? {}) as Partial<PopupToastSettings>;
  return {
    modal: {
      enabled: Boolean(modal.enabled),
      image: str(modal.image),
      heading: str(modal.heading, DEFAULT_SETTINGS.modal.heading),
      description: str(modal.description, DEFAULT_SETTINGS.modal.description),
      linkLabel: linkLabel(modal.linkLabel),
      linkHref: str(modal.linkHref),
      collectForm: modal.collectForm == null ? true : Boolean(modal.collectForm),
      submitLabel: str(modal.submitLabel, DEFAULT_SETTINGS.modal.submitLabel),
      successMessage: str(modal.successMessage, DEFAULT_SETTINGS.modal.successMessage),
    },
    toast: {
      enabled: Boolean(toast.enabled),
      text: str(toast.text, DEFAULT_SETTINGS.toast.text),
      linkLabel: linkLabel(toast.linkLabel, DEFAULT_SETTINGS.toast.linkLabel),
      linkHref: str(toast.linkHref, DEFAULT_SETTINGS.toast.linkHref),
    },
  };
}

async function readPopupSettingsUncached(): Promise<PopupSettings> {
  const raw = await readPersistentJsonFile<Partial<PopupSettings>>(POPUP_SETTINGS_PATH, {});
  return normalizePopupSettings(raw);
}

const getPopupSettingsCached = unstable_cache(
  async () => readPopupSettingsUncached(),
  ["popup-settings-v1"],
  { revalidate: 120, tags: [POPUP_SETTINGS_CACHE_TAG] },
);

export async function getPopupSettings(): Promise<PopupSettings> {
  try {
    return await getPopupSettingsCached();
  } catch {
    return normalizePopupSettings(null);
  }
}

export async function updatePopupSettings(patch: Partial<PopupSettings>): Promise<PopupSettings> {
  const current = await readPopupSettingsUncached();
  const next = normalizePopupSettings({
    modal: { ...current.modal, ...(patch.modal ?? {}) },
    toast: { ...current.toast, ...(patch.toast ?? {}) },
  });
  await writePersistentJsonFile(POPUP_SETTINGS_PATH, next);
  try {
    revalidateTag(POPUP_SETTINGS_CACHE_TAG);
  } catch {
    // outside request scope — ignore
  }
  return next;
}

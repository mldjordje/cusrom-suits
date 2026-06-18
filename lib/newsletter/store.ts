import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";

const NEWSLETTER_SUBSCRIBERS_PATH = "data/newsletter-subscribers.json";

export type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string;
  createdAt: string;
  /** Optional profile fields captured by the promo popup signup. */
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: string;
};

type NewsletterProfile = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: string;
};

const cleanProfile = (p?: NewsletterProfile): NewsletterProfile => {
  const trim = (v?: string) => String(v || "").trim().slice(0, 120);
  const out: NewsletterProfile = {};
  if (p?.firstName) out.firstName = trim(p.firstName);
  if (p?.lastName) out.lastName = trim(p.lastName);
  if (p?.birthDate) out.birthDate = trim(p.birthDate);
  if (p?.gender) out.gender = trim(p.gender);
  return out;
};

const normalizeEmail = (value: string) => String(value || "").trim().toLowerCase();

export const isValidNewsletterEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

export async function listNewsletterSubscribers() {
  const items = await readPersistentJsonFile<NewsletterSubscriber[]>(NEWSLETTER_SUBSCRIBERS_PATH, []);
  return [...items].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}

export async function subscribeToNewsletter(
  input: { email: string; source?: string } & NewsletterProfile,
) {
  const email = normalizeEmail(input.email);
  if (!isValidNewsletterEmail(email)) {
    return { success: false as const, message: "Unesite validnu email adresu." };
  }

  const profile = cleanProfile(input);
  const subscribers = await listNewsletterSubscribers();
  const existing = subscribers.find((item) => normalizeEmail(item.email) === email);
  if (existing) {
    return {
      success: true as const,
      duplicate: true as const,
      subscriber: existing,
      message: "Ova email adresa je vec prijavljena.",
    };
  }

  const subscriber: NewsletterSubscriber = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email,
    source: String(input.source || "storefront-footer").trim() || "storefront-footer",
    createdAt: new Date().toISOString(),
    ...profile,
  };

  await writePersistentJsonFile(NEWSLETTER_SUBSCRIBERS_PATH, [subscriber, ...subscribers].slice(0, 5000));

  return {
    success: true as const,
    duplicate: false as const,
    subscriber,
    message: "Uspesno ste prijavljeni na newsletter.",
  };
}

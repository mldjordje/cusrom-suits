import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";

const NEWSLETTER_SUBSCRIBERS_PATH = "data/newsletter-subscribers.json";

export type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string;
  createdAt: string;
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

export async function subscribeToNewsletter(input: { email: string; source?: string }) {
  const email = normalizeEmail(input.email);
  if (!isValidNewsletterEmail(email)) {
    return { success: false as const, message: "Unesite validnu email adresu." };
  }

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
  };

  await writePersistentJsonFile(NEWSLETTER_SUBSCRIBERS_PATH, [subscriber, ...subscribers].slice(0, 5000));

  return {
    success: true as const,
    duplicate: false as const,
    subscriber,
    message: "Uspesno ste prijavljeni na newsletter.",
  };
}

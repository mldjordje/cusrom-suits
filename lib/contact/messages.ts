import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";

const CONTACT_MESSAGES_PATH = "data/contact-messages.json";

export type ContactMessageStatus = "open" | "resolved";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  subject: string;
  message: string;
  preferredStore: string;
  source: string;
  createdAt: string;
  status?: ContactMessageStatus;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
};

const normalizeStatus = (value: unknown): ContactMessageStatus =>
  value === "resolved" ? "resolved" : "open";

const normalizeMessage = (raw: ContactMessage): ContactMessage => ({
  ...raw,
  status: normalizeStatus(raw.status),
  resolvedAt: raw.status === "resolved" ? raw.resolvedAt || raw.createdAt : null,
  resolvedBy: raw.status === "resolved" ? raw.resolvedBy || null : null,
});

export async function listContactMessages() {
  const items = await readPersistentJsonFile<ContactMessage[]>(CONTACT_MESSAGES_PATH, []);
  return items
    .map(normalizeMessage)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export async function appendContactMessage(entry: ContactMessage) {
  const list = await listContactMessages();
  const normalized: ContactMessage = {
    ...entry,
    status: entry.status || "open",
    resolvedAt: null,
    resolvedBy: null,
  };
  const next = [normalized, ...list].slice(0, 1000);
  await writePersistentJsonFile(CONTACT_MESSAGES_PATH, next);
  return normalized;
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
  actor?: string | null,
): Promise<ContactMessage | null> {
  const list = await listContactMessages();
  const index = list.findIndex((entry) => entry.id === id);
  if (index === -1) return null;
  const current = list[index];
  const updated: ContactMessage = {
    ...current,
    status,
    resolvedAt: status === "resolved" ? new Date().toISOString() : null,
    resolvedBy: status === "resolved" ? actor || null : null,
  };
  list[index] = updated;
  await writePersistentJsonFile(CONTACT_MESSAGES_PATH, list);
  return updated;
}

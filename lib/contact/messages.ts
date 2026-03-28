import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";

const CONTACT_MESSAGES_PATH = "data/contact-messages.json";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  preferredStore: string;
  source: string;
  createdAt: string;
};

export async function listContactMessages() {
  const items = await readPersistentJsonFile<ContactMessage[]>(CONTACT_MESSAGES_PATH, []);
  return [...items].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}

export async function appendContactMessage(entry: ContactMessage) {
  const list = await listContactMessages();
  const next = [entry, ...list].slice(0, 1000);
  await writePersistentJsonFile(CONTACT_MESSAGES_PATH, next);
  return entry;
}

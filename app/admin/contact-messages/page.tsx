import ContactMessagesClient from "./ContactMessagesClient";
import { listContactMessages } from "@/lib/contact/messages";

export const dynamic = "force-dynamic";

export default async function ContactMessagesAdminPage() {
  const messages = await listContactMessages();
  return <ContactMessagesClient initialMessages={messages} />;
}

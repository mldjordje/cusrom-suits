import { readJsonFile } from "@/lib/storage/jsonStore";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
};

const CONTACT_MESSAGES_PATH = "data/contact-messages.json";

const formatDate = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sr-RS");
};

export default async function ContactMessagesAdminPage() {
  const messages = await readJsonFile<ContactMessage[]>(CONTACT_MESSAGES_PATH, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Inbox</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Kontakt poruke</h1>
        <p className="mt-1 text-sm text-slate-600">Poruke poslate sa /kontakt forme.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm text-slate-600">Ukupno: {messages.length}</p>
        <div className="space-y-3">
          {messages.map((message) => (
            <article key={message.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{message.name}</p>
                <span className="text-xs text-slate-500">{formatDate(message.createdAt)}</span>
              </div>
              <p className="mb-1 text-sm text-slate-700">
                <strong>Email:</strong> {message.email}
              </p>
              <p className="mb-1 text-sm text-slate-700">
                <strong>Telefon:</strong> {message.phone || "-"}
              </p>
              <p className="mb-1 text-sm text-slate-700">
                <strong>Tema:</strong> {message.subject || "-"}
              </p>
              <p className="mb-0 text-sm text-slate-700 whitespace-pre-wrap">{message.message}</p>
            </article>
          ))}
          {!messages.length ? <p className="text-sm text-slate-500">Nema poruka.</p> : null}
        </div>
      </div>
    </div>
  );
}

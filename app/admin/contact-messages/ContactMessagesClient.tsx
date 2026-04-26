"use client";

import { useMemo, useState } from "react";
import type { ContactMessage, ContactMessageStatus } from "@/lib/contact/messages";

const formatDate = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sr-RS");
};

type Filter = "all" | "open" | "resolved";

type Props = {
  initialMessages: ContactMessage[];
};

const badgeStyles: Record<ContactMessageStatus, string> = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function ContactMessagesClient({ initialMessages }: Props) {
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: messages.length,
      open: messages.filter((m) => (m.status || "open") === "open").length,
      resolved: messages.filter((m) => m.status === "resolved").length,
    }),
    [messages],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      const status = m.status || "open";
      if (filter === "open" && status !== "open") return false;
      if (filter === "resolved" && status !== "resolved") return false;
      if (!q) return true;
      return [m.name, m.email, m.phone, m.subject, m.message, m.preferredStore, m.source]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(q));
    });
  }, [messages, filter, query]);

  const updateStatus = async (id: string, status: ContactMessageStatus) => {
    setUpdatingId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/contact-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!json?.success) {
        throw new Error(json?.message || "Neuspesna izmena statusa.");
      }
      const updated: ContactMessage = json.message;
      setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err) {
      setError((err as Error)?.message || "Greska pri azuriranju.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Inbox</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Kontakt poruke</h1>
        <p className="mt-1 text-sm text-slate-600">Poruke poslate sa /kontakt forme.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["all", "open", "resolved"] as Filter[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                filter === key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-700 hover:border-slate-400"
              }`}
            >
              {key === "all" ? "Sve" : key === "open" ? "Otvorene" : "Resene"} ({counts[key]})
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pretraga po imenu, email-u, poruci..."
            className="ml-auto w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
        <p className="mb-3 text-sm text-slate-600">Prikazano: {visible.length}</p>

        <div className="space-y-3">
          {visible.map((message) => {
            const status: ContactMessageStatus = message.status || "open";
            const isResolved = status === "resolved";
            return (
              <article key={message.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{message.name}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeStyles[status]}`}
                    >
                      {status === "open" ? "Otvorena" : "Resena"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(message.createdAt)}</span>
                </div>
                <p className="mb-1 text-sm text-slate-700">
                  <strong>Email:</strong>{" "}
                  <a href={`mailto:${message.email}`} className="text-slate-900 hover:underline">
                    {message.email}
                  </a>
                </p>
                <p className="mb-1 text-sm text-slate-700">
                  <strong>Telefon:</strong>{" "}
                  {message.phone ? (
                    <a href={`tel:${message.phone}`} className="text-slate-900 hover:underline">
                      {message.phone}
                    </a>
                  ) : (
                    "-"
                  )}
                </p>
                {message.company ? (
                  <p className="mb-1 text-sm text-slate-700">
                    <strong>Firma:</strong> {message.company}
                  </p>
                ) : null}
                <p className="mb-1 text-sm text-slate-700">
                  <strong>Tema:</strong> {message.subject || "-"}
                </p>
                <p className="mb-1 text-sm text-slate-700">
                  <strong>Kanal:</strong> {message.source || "kontakt-forma"}
                </p>
                <p className="mb-2 text-sm text-slate-700">
                  <strong>Lokacija:</strong> {message.preferredStore || "nije izabrano"}
                </p>
                <p className="mb-3 whitespace-pre-wrap text-sm text-slate-700">{message.message}</p>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {!isResolved ? (
                    <button
                      onClick={() => updateStatus(message.id, "resolved")}
                      disabled={updatingId === message.id}
                      className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Oznaci kao resenu
                    </button>
                  ) : (
                    <>
                      {message.resolvedAt ? (
                        <span className="text-xs text-slate-500">
                          Resena: {formatDate(message.resolvedAt)}
                        </span>
                      ) : null}
                      <button
                        onClick={() => updateStatus(message.id, "open")}
                        disabled={updatingId === message.id}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Vrati u otvorene
                      </button>
                    </>
                  )}
                  <a
                    href={`mailto:${message.email}?subject=${encodeURIComponent(
                      `Re: ${message.subject || "Upit sa sajta"}`,
                    )}`}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:border-slate-400"
                  >
                    Odgovori mailom
                  </a>
                </div>
              </article>
            );
          })}
          {!visible.length ? <p className="text-sm text-slate-500">Nema poruka u ovom filteru.</p> : null}
        </div>
      </div>
    </div>
  );
}

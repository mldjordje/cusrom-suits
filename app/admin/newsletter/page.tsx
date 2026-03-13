import { listNewsletterSubscribers } from "@/lib/newsletter/store";

const formatDate = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sr-RS");
};

export default async function NewsletterAdminPage() {
  const subscribers = await listNewsletterSubscribers();

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Newsletter</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Pretplatnici</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pregled prijava sa javnog sajta. Ukupno: {subscribers.length}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {subscribers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-3 py-3 font-semibold">Email</th>
                  <th className="px-3 py-3 font-semibold">Izvor</th>
                  <th className="px-3 py-3 font-semibold">Prijava</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-3">
                      <a href={`mailto:${subscriber.email}`} className="font-medium text-slate-900 hover:text-slate-700">
                        {subscriber.email}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{subscriber.source || "storefront-footer"}</td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(subscriber.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Jos nema newsletter prijava.</p>
        )}
      </div>
    </div>
  );
}

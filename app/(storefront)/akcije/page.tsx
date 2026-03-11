import { redirect } from "next/navigation";

export const metadata = {
  title: "Akcije | Santos & Santorini",
  description: "Aktuelni proizvodi na akciji u web shopu.",
};

export default function SalesPage() {
  redirect("/web-shop?onSale=1");
}

import { redirect } from "next/navigation";

export default function AdminAkcijeRedirect() {
  redirect("/admin/webshop?tab=akcije");
}

import { redirect } from "next/navigation";

export default function AdminLandingRedirect() {
  redirect("/admin/webshop?tab=landing");
}

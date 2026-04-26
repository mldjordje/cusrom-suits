import type { ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import AdminNav from "./components/AdminNav";
import AdminShell from "./components/AdminShell";
import { buildSeoMetadata } from "@/lib/seo";
import { getAdminViewerFromCookieStore } from "@/lib/adminAuth";
import "./admin-template.css";

export const metadata: Metadata = {
  ...buildSeoMetadata({
    title: "Admin | Santos & Santorini",
    description: "Administracija za Santos & Santorini web shop i operacije.",
    path: "/admin",
    noIndex: true,
  }),
  // Override the root storefront manifest so that installing from /admin
  // creates a separate "Santos Admin" PWA that opens at /admin, not at /.
  manifest: "/admin-manifest.webmanifest",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const generatedAt = new Date().toLocaleString("sr-RS");
  const viewer = await getAdminViewerFromCookieStore(await cookies());

  return (
    <AdminShell
      generatedAt={generatedAt}
      viewerName={viewer?.displayName || viewer?.username || "Admin"}
      viewerRoles={viewer?.roleIds || []}
      sidebar={(
        <>
          <Link href="/admin" className="admin-template-brand">
            <span className="admin-template-brand-dot" aria-hidden="true" />
            <span className="admin-template-brand-text">
              <strong>Santos Admin</strong>
              <small>web shop operations</small>
            </span>
          </Link>
          <AdminNav permissions={viewer?.permissions || []} />
          <p className="admin-template-sidebar-foot">Web shop, sadrzaj i operacije</p>
        </>
      )}
    >
      {children}
    </AdminShell>
  );
}

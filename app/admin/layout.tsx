import type { ReactNode } from "react";
import Link from "next/link";
import AdminNav from "./components/AdminNav";
import "./admin-template.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const generatedAt = new Date().toLocaleString("sr-RS");

  return (
    <div className="admin-template-root">
      <div className="admin-template-shell">
        <aside className="admin-template-sidebar">
          <Link href="/admin" className="admin-template-brand">
            <span className="admin-template-brand-dot" aria-hidden="true" />
            <span className="admin-template-brand-text">
              <strong>Santos Admin</strong>
              <small>admintemplate layout</small>
            </span>
          </Link>
          <AdminNav />
          <p className="admin-template-sidebar-foot">Custom Suits + Web Shop ops</p>
        </aside>

        <div className="admin-template-main">
          <header className="admin-template-topbar">
            <div className="admin-template-topbar-title">
              <p>Control Panel</p>
              <h1>Santos Operations</h1>
            </div>
            <div className="admin-template-topbar-meta">
              <span>Status: Online</span>
              <span>{generatedAt}</span>
            </div>
          </header>
          <section className="admin-template-content">{children}</section>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string | null;
  postType: "blog" | "news";
  isPublished: boolean;
  publishedAt: string | null;
};

const defaultDraft = {
  id: "",
  title: "",
  excerpt: "",
  bodyHtml: "",
  postType: "blog" as "blog" | "news",
  isPublished: true,
};

export default function AdminBlogPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(defaultDraft);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/blog/posts?pageSize=200");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Greska pri ucitavanju.");
      } else {
        setPosts(json.data || []);
      }
    } catch (err: any) {
      setError(err?.message || "Greska pri ucitavanju.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visiblePosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((post) =>
      `${post.title} ${post.slug} ${post.postType}`.toLowerCase().includes(q),
    );
  }, [posts, query]);

  const edit = (post: Post) => {
    setDraft({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt || "",
      bodyHtml: post.bodyHtml || "",
      postType: post.postType,
      isPublished: post.isPublished,
    });
  };

  const resetDraft = () => setDraft(defaultDraft);

  const save = async () => {
    if (!draft.title.trim()) {
      setError("Title je obavezan.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const method = draft.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/blog/posts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id || undefined,
          title: draft.title,
          excerpt: draft.excerpt || null,
          bodyHtml: draft.bodyHtml || null,
          postType: draft.postType,
          isPublished: draft.isPublished,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Snimanje nije uspelo.");
      } else {
        resetDraft();
        await load();
      }
    } catch (err: any) {
      setError(err?.message || "Snimanje nije uspelo.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete post?")) return;
    const res = await fetch(`/api/admin/blog/posts?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json?.success) {
      setError(json?.message || "Brisanje nije uspelo.");
      return;
    }
    await load();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Content</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Blog + News posts</h1>
        <p className="mt-1 text-sm text-slate-600">Unified CMS for merged legacy content feed.</p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Title"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={draft.postType}
            onChange={(e) => setDraft((prev) => ({ ...prev, postType: e.target.value as "blog" | "news" }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="blog">Blog</option>
            <option value="news">News</option>
          </select>
          <textarea
            value={draft.excerpt}
            onChange={(e) => setDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
            placeholder="Excerpt"
            className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          />
          <textarea
            value={draft.bodyHtml}
            onChange={(e) => setDraft((prev) => ({ ...prev, bodyHtml: e.target.value }))}
            placeholder="Body HTML"
            className="min-h-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700"
          >
            {saving ? "Saving..." : draft.id ? "Update post" : "Create post"}
          </button>
          <button
            onClick={resetDraft}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title/slug/type"
            className="w-full max-w-sm rounded-full border border-slate-200 px-4 py-2 text-sm"
          />
          <button
            onClick={load}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
          >
            Refresh
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-500">Ucitavanje...</p> : null}
        <div className="space-y-2">
          {visiblePosts.map((post) => (
            <div key={post.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{post.title}</p>
                  <p className="text-xs text-slate-500">
                    /{post.slug} • {post.postType} • {post.isPublished ? "published" : "draft"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => edit(post)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(post.id)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!visiblePosts.length && !loading ? <p className="text-sm text-slate-500">No posts.</p> : null}
        </div>
      </div>
    </div>
  );
}


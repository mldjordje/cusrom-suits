import { getAnonSupabase, getServiceSupabase } from "@/lib/supabase/server";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string | null;
  coverImage: string | null;
  postType: "blog" | "news";
  sourceLegacyId: number | null;
  sourceTable: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rawPayload: Record<string, unknown>;
};

const POSTS_FILE = "data/posts.json";

const slugify = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

const nowIso = () => new Date().toISOString();

const mapRowToPost = (row: any): BlogPost => ({
  id: String(row.id),
  slug: String(row.slug),
  title: String(row.title || ""),
  excerpt: row.excerpt ? String(row.excerpt) : null,
  bodyHtml: row.body_html ? String(row.body_html) : null,
  coverImage: row.cover_image ? String(row.cover_image) : null,
  postType: row.post_type === "news" ? "news" : "blog",
  sourceLegacyId:
    row.source_legacy_id == null || Number.isNaN(Number(row.source_legacy_id))
      ? null
      : Number(row.source_legacy_id),
  sourceTable: row.source_table ? String(row.source_table) : null,
  isPublished: row.is_published !== false,
  publishedAt: row.published_at ? String(row.published_at) : null,
  createdAt: row.created_at ? String(row.created_at) : nowIso(),
  updatedAt: row.updated_at ? String(row.updated_at) : nowIso(),
  rawPayload: row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {},
});

export async function listPosts(input?: {
  query?: string;
  type?: "blog" | "news" | "all";
  page?: number;
  pageSize?: number;
  onlyPublished?: boolean;
}) {
  const query = String(input?.query || "").trim().toLowerCase();
  const type = input?.type || "all";
  const page = Math.max(1, Number(input?.page || 1));
  const pageSize = Math.max(1, Math.min(100, Number(input?.pageSize || 12)));
  const onlyPublished = input?.onlyPublished !== false;

  const supabase = getAnonSupabase() || getServiceSupabase();
  if (supabase) {
    let builder = supabase.from("content_posts").select("*");
    if (type !== "all") builder = builder.eq("post_type", type);
    if (onlyPublished) builder = builder.eq("is_published", true);
    if (query) builder = builder.ilike("title", `%${query}%`);
    builder = builder.order("published_at", { ascending: false, nullsFirst: false });
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await builder.range(from, to);
    if (!error && data) {
      return {
        items: data.map(mapRowToPost),
        total: Number(count || data.length),
        page,
        pageSize,
      };
    }
  }

  const local = await readJsonFile<BlogPost[]>(POSTS_FILE, []);
  let filtered = [...local];
  if (type !== "all") filtered = filtered.filter((item) => item.postType === type);
  if (onlyPublished) filtered = filtered.filter((item) => item.isPublished);
  if (query) {
    filtered = filtered.filter((item) =>
      `${item.title} ${item.excerpt || ""}`.toLowerCase().includes(query),
    );
  }
  filtered.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function getPostBySlug(slug: string) {
  const safe = String(slug || "").trim();
  if (!safe) return null;
  const supabase = getAnonSupabase() || getServiceSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("content_posts")
      .select("*")
      .eq("slug", safe)
      .maybeSingle();
    if (!error && data) return mapRowToPost(data);
  }
  const local = await readJsonFile<BlogPost[]>(POSTS_FILE, []);
  return local.find((item) => item.slug === safe) || null;
}

export async function upsertPost(input: Partial<BlogPost> & { title: string }) {
  const now = nowIso();
  const title = String(input.title || "").trim();
  if (!title) throw new Error("Title is required.");
  const slug = slugify(input.slug || title);
  const base = {
    slug,
    title,
    excerpt: input.excerpt || null,
    body_html: input.bodyHtml || null,
    cover_image: input.coverImage || null,
    post_type: input.postType || "blog",
    source_legacy_id: input.sourceLegacyId ?? null,
    source_table: input.sourceTable || null,
    is_published: input.isPublished !== false,
    published_at: input.publishedAt || now,
    updated_at: now,
    raw_payload: input.rawPayload || {},
  };

  const supabase = getServiceSupabase();
  if (supabase) {
    if (input.id) {
      const { data, error } = await supabase
        .from("content_posts")
        .update(base)
        .eq("id", input.id)
        .select("*")
        .single();
      if (!error && data) return mapRowToPost(data);
    } else {
      const { data, error } = await supabase
        .from("content_posts")
        .insert({ ...base, created_at: now })
        .select("*")
        .single();
      if (!error && data) return mapRowToPost(data);
    }
  }

  const local = await readJsonFile<BlogPost[]>(POSTS_FILE, []);
  if (input.id) {
    const idx = local.findIndex((item) => item.id === input.id);
    if (idx >= 0) {
      local[idx] = {
        ...local[idx],
        slug,
        title,
        excerpt: input.excerpt || null,
        bodyHtml: input.bodyHtml || null,
        coverImage: input.coverImage || null,
        postType: input.postType || local[idx].postType || "blog",
        isPublished: input.isPublished !== false,
        publishedAt: input.publishedAt || local[idx].publishedAt,
        sourceLegacyId: input.sourceLegacyId ?? local[idx].sourceLegacyId,
        sourceTable: input.sourceTable || local[idx].sourceTable,
        rawPayload: input.rawPayload || local[idx].rawPayload || {},
        updatedAt: now,
      };
      await writeJsonFile(POSTS_FILE, local);
      return local[idx];
    }
  }
  const created: BlogPost = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    slug,
    title,
    excerpt: input.excerpt || null,
    bodyHtml: input.bodyHtml || null,
    coverImage: input.coverImage || null,
    postType: input.postType || "blog",
    sourceLegacyId: input.sourceLegacyId ?? null,
    sourceTable: input.sourceTable || null,
    isPublished: input.isPublished !== false,
    publishedAt: input.publishedAt || now,
    createdAt: now,
    updatedAt: now,
    rawPayload: input.rawPayload || {},
  };
  local.unshift(created);
  await writeJsonFile(POSTS_FILE, local);
  return created;
}

export async function deletePost(id: string) {
  const supabase = getServiceSupabase();
  if (supabase) {
    const { error } = await supabase.from("content_posts").delete().eq("id", id);
    if (!error) return true;
  }
  const local = await readJsonFile<BlogPost[]>(POSTS_FILE, []);
  const filtered = local.filter((item) => item.id !== id);
  await writeJsonFile(POSTS_FILE, filtered);
  return true;
}


/* ============================================================
   Admin API — content sections, collections, posts, media,
   enquiries. Every route requires a valid session.
   ============================================================ */
import { Router } from "express";
import multer from "multer";
import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { unlink } from "node:fs/promises";
import { db, getKv, setKv, UPLOADS_DIR } from "./db.js";
import { KV_KEYS, COLLECTIONS, listCollection, buildContent, mediaUrl, slugify } from "./content.js";
import { renderMarkdown } from "./markdown.js";
import { requireAuth } from "./auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);

/* ---------------- Dashboard ---------------- */
adminRouter.get("/stats", (_req, res) => {
  const one = (sql) => db.prepare(sql).get().n;
  res.json({
    posts: one("SELECT COUNT(*) AS n FROM posts"),
    draftPosts: one("SELECT COUNT(*) AS n FROM posts WHERE status='draft'"),
    publishedPosts: one("SELECT COUNT(*) AS n FROM posts WHERE status='published'"),
    enquiries: one("SELECT COUNT(*) AS n FROM enquiries"),
    unreadEnquiries: one("SELECT COUNT(*) AS n FROM enquiries WHERE is_read=0"),
    resources: one("SELECT COUNT(*) AS n FROM resources"),
    media: one("SELECT COUNT(*) AS n FROM media")
  });
});

/* ---------------- Section copy (KV groups) ---------------- */
adminRouter.get("/content", (_req, res) => res.json(buildContent()));

adminRouter.put("/content", (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object") {
    return res.status(400).json({ error: "Expected a content object" });
  }
  for (const key of KV_KEYS) {
    if (!(key in incoming)) continue;
    const value = incoming[key];
    if (typeof value !== "object" || Array.isArray(value) || value === null) {
      return res.status(400).json({ error: `"${key}" must be an object` });
    }
    const merged = { ...(getKv(key, {}) || {}), ...value };
    setKv(key, merged);
  }
  res.json({ ok: true, content: buildContent() });
});

/* ---------------- Generic ordered collections ---------------- */
function asCollection(name) {
  const c = COLLECTIONS[name];
  if (!c) return null;
  return c;
}
function cleanRow(name, body) {
  const c = asCollection(name);
  const row = {};
  for (const col of c.columns) {
    if (col === "wide") {
      row.wide = body.wide === true || body.wide === 1 || body.wide === "1" ? 1 : 0;
    } else {
      row[col] = String(body?.[col] ?? "").slice(0, col === "body" ? 2000 : 200);
    }
  }
  return row;
}

adminRouter.get("/collections/:name", (req, res) => {
  if (!asCollection(req.params.name)) return res.status(404).json({ error: "Unknown collection" });
  res.json({ items: listCollection(req.params.name) });
});

adminRouter.post("/collections/:name", (req, res) => {
  const c = asCollection(req.params.name);
  if (!c) return res.status(404).json({ error: "Unknown collection" });
  const row = cleanRow(req.params.name, req.body);
  const pos = db.prepare(`SELECT COALESCE(MAX(pos)+1, 0) AS p FROM ${c.table}`).get().p;
  const cols = ["pos", ...c.columns];
  const result = db.prepare(
    `INSERT INTO ${c.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
  ).run(pos, ...cols.slice(1).map((k) => row[k]));
  res.json({ ok: true, item: db.prepare(`SELECT * FROM ${c.table} WHERE id = ?`).get(result.lastInsertRowid) });
});

adminRouter.put("/collections/:name/:id", (req, res) => {
  const c = asCollection(req.params.name);
  if (!c) return res.status(404).json({ error: "Unknown collection" });
  const existing = db.prepare(`SELECT * FROM ${c.table} WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const row = cleanRow(req.params.name, req.body);
  const sets = c.columns.map((k) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE ${c.table} SET ${sets} WHERE id = ?`).run(...c.columns.map((k) => row[k]), req.params.id);
  res.json({ ok: true, item: db.prepare(`SELECT * FROM ${c.table} WHERE id = ?`).get(req.params.id) });
});

adminRouter.delete("/collections/:name/:id", (req, res) => {
  const c = asCollection(req.params.name);
  if (!c) return res.status(404).json({ error: "Unknown collection" });
  db.prepare(`DELETE FROM ${c.table} WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

adminRouter.post("/collections/:name/:id/move", (req, res) => {
  const c = asCollection(req.params.name);
  if (!c) return res.status(404).json({ error: "Unknown collection" });
  const id = Number(req.params.id);
  const cur = db.prepare(`SELECT * FROM ${c.table} WHERE id = ?`).get(id);
  if (!cur) return res.status(404).json({ error: "Not found" });
  const dir = req.body?.dir === "down" ? 1 : -1;
  const swap = dir < 0
    ? db.prepare(`SELECT * FROM ${c.table} WHERE pos < ? ORDER BY pos DESC LIMIT 1`).get(cur.pos)
    : db.prepare(`SELECT * FROM ${c.table} WHERE pos > ? ORDER BY pos ASC LIMIT 1`).get(cur.pos);
  if (swap) {
    db.prepare(`UPDATE ${c.table} SET pos = ? WHERE id = ?`).run(swap.pos, id);
    db.prepare(`UPDATE ${c.table} SET pos = ? WHERE id = ?`).run(cur.pos, swap.id);
  }
  res.json({ ok: true, items: listCollection(req.params.name) });
});

/* ---------------- Blog posts ---------------- */
function postRow(id) {
  const row = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
  if (!row) return null;
  const cover = row.cover_media_id
    ? db.prepare("SELECT * FROM media WHERE id = ?").get(row.cover_media_id)
    : null;
  return {
    ...row,
    coverUrl: mediaUrl(cover),
    bodyHtml: renderMarkdown(row.body),
    tagsList: row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : []
  };
}

adminRouter.get("/posts", (_req, res) => {
  const rows = db.prepare("SELECT * FROM posts ORDER BY updated_at DESC, id DESC").all();
  res.json({
    posts: rows.map((r) => ({
      id: r.id, slug: r.slug, title: r.title, excerpt: r.excerpt,
      status: r.status, publishedAt: r.published_at, updatedAt: r.updated_at,
      coverUrl: postRow(r.id).coverUrl
    }))
  });
});

adminRouter.get("/posts/:id", (req, res) => {
  const post = postRow(req.params.id);
  if (!post) return res.status(404).json({ error: "Not found" });
  res.json({ post });
});

/* Live Markdown preview for drafts (never published) */
adminRouter.post("/posts/preview", (req, res) => {
  res.json({ bodyHtml: renderMarkdown(String(req.body?.body || "")) });
});

function readPostBody(body) {
  return {
    title: String(body.title || "").trim().slice(0, 200),
    excerpt: String(body.excerpt || "").slice(0, 400),
    body: String(body.body || "").slice(0, 100_000),
    tags: String(body.tags || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12).join(", "),
    cover_media_id: body.coverMediaId ? Number(body.coverMediaId) : null,
    status: body.status === "published" ? "published" : "draft"
  };
}

adminRouter.post("/posts", (req, res) => {
  const data = readPostBody(req.body);
  if (!data.title) return res.status(400).json({ error: "Title is required" });
  const slug = slugify(data.title);
  const publishedAt = data.status === "published"
    ? (req.body.publishedAt || new Date().toISOString().slice(0, 10))
    : null;
  const r = db.prepare(
    `INSERT INTO posts (slug, title, excerpt, body, tags, cover_media_id, status, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(slug, data.title, data.excerpt, data.body, data.tags, data.cover_media_id, data.status, publishedAt);
  res.json({ ok: true, post: postRow(r.lastInsertRowid) });
});

adminRouter.put("/posts/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const data = readPostBody(req.body);
  if (!data.title) return res.status(400).json({ error: "Title is required" });
  let slug = existing.slug;
  if (req.body.slug) slug = slugify(req.body.slug, existing.id);
  let publishedAt = existing.published_at;
  if (data.status === "published") {
    publishedAt = existing.published_at || req.body.publishedAt || new Date().toISOString().slice(0, 10);
  }
  db.prepare(
    `UPDATE posts SET slug=?, title=?, excerpt=?, body=?, tags=?, cover_media_id=?, status=?, published_at=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(slug, data.title, data.excerpt, data.body, data.tags, data.cover_media_id, data.status, publishedAt, req.params.id);
  res.json({ ok: true, post: postRow(req.params.id) });
});

adminRouter.delete("/posts/:id", (req, res) => {
  db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- Media library ---------------- */
const ALLOWED_MIME = /^(image\/(jpeg|png|webp|gif|avif)|application\/pdf)$/;
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
      cb(null, `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}${ext}`);
    }
  }),
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only images (JPG, PNG, WebP, GIF, AVIF) and PDFs up to 16 MB are allowed"));
  }
});

adminRouter.get("/media", (_req, res) => {
  const rows = db.prepare("SELECT * FROM media ORDER BY created_at DESC, id DESC").all();
  res.json({ media: rows.map((m) => ({ ...m, url: mediaUrl(m) })) });
});

adminRouter.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received" });
  const r = db.prepare(
    "INSERT INTO media (filename, original_name, mime, size) VALUES (?, ?, ?, ?)"
  ).run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);
  const row = db.prepare("SELECT * FROM media WHERE id = ?").get(r.lastInsertRowid);
  res.json({ ok: true, media: { ...row, url: mediaUrl(row) } });
});

adminRouter.delete("/media/:id", async (req, res) => {
  const row = db.prepare("SELECT * FROM media WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM media WHERE id = ?").run(req.params.id);
  try { await unlink(`${UPLOADS_DIR}/${row.filename}`); } catch { /* already gone */ }
  res.json({ ok: true });
});

/* ---------------- Enquiries ---------------- */
adminRouter.get("/enquiries", (_req, res) => {
  res.json({ enquiries: db.prepare("SELECT * FROM enquiries ORDER BY created_at DESC, id DESC").all() });
});

adminRouter.patch("/enquiries/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM enquiries WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const isRead = req.body?.isRead ? 1 : 0;
  db.prepare("UPDATE enquiries SET is_read = ? WHERE id = ?").run(isRead, req.params.id);
  res.json({ ok: true });
});

adminRouter.delete("/enquiries/:id", (req, res) => {
  db.prepare("DELETE FROM enquiries WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

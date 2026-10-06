/* ============================================================
   Public API — site content, blog posts, contact submissions
   ============================================================ */
import { Router } from "express";
import { db } from "./db.js";
import { buildContent, mediaUrl } from "./content.js";
import { renderMarkdown } from "./markdown.js";

export const publicRouter = Router();

publicRouter.get("/health", (_req, res) => res.json({ ok: true }));

/* Everything the homepage needs in one round trip */
publicRouter.get("/content", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(buildContent());
});

function decoratePost(row) {
  if (!row) return null;
  const cover = row.cover_media_id
    ? db.prepare("SELECT * FROM media WHERE id = ?").get(row.cover_media_id)
    : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    bodyHtml: renderMarkdown(row.body),
    tags: row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    coverUrl: mediaUrl(cover),
    coverAlt: cover ? cover.original_name : "",
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at
  };
}

publicRouter.get("/posts", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 12, 50);
  const rows = db.prepare(
    `SELECT * FROM posts WHERE status = 'published'
     AND published_at IS NOT NULL AND published_at <= datetime('now')
     ORDER BY published_at DESC, id DESC LIMIT ?`
  ).all(limit);
  const posts = rows.map(decoratePost).map(({ body, bodyHtml, ...card }) => card);
  res.json({ posts });
});

publicRouter.get("/posts/:slug", (req, res) => {
  const row = db.prepare(
    `SELECT * FROM posts WHERE slug = ? AND status = 'published'
     AND published_at IS NOT NULL AND published_at <= datetime('now')`
  ).get(req.params.slug);
  if (!row) return res.status(404).json({ error: "Post not found" });
  res.json({ post: decoratePost(row) });
});

/* ---------- Contact form → enquiries ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const contactIps = new Map();

publicRouter.post("/contact", (req, res) => {
  // Honeypot: bots fill hidden "company" field; humans never see it
  if (req.body?.company) return res.json({ ok: true });

  const ip = req.ip || "unknown";
  const windowStart = contactIps.get(ip) || 0;
  if (Date.now() - windowStart < 60_000) {
    return res.status(429).json({ error: "Please wait a moment before sending another message." });
  }

  const name = String(req.body?.name || "").trim().slice(0, 120);
  const email = String(req.body?.email || "").trim().slice(0, 160);
  const message = String(req.body?.message || "").trim().slice(0, 4000);

  const errors = [];
  if (name.length < 2) errors.push("Please enter your name.");
  if (!EMAIL_RE.test(email)) errors.push("Please enter a valid email address.");
  if (message.length < 10) errors.push("Please add a little more detail to your message.");
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });

  db.prepare("INSERT INTO enquiries (name, email, message) VALUES (?, ?, ?)").run(name, email, message);
  contactIps.set(ip, Date.now());
  res.json({ ok: true, message: "Thank you — your message has reached Glen. He replies personally, usually within a day or two." });
});

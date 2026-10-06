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
publicRouter.get("/content", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await buildContent());
});

async function decoratePost(row) {
  if (!row) return null;
  const cover = row.cover_media_id
    ? await db.prepare("SELECT * FROM media WHERE id = $1").get(row.cover_media_id)
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

publicRouter.get("/posts", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 12, 50);
  const rows = await db.prepare(
    `SELECT * FROM posts WHERE status = 'published'
     AND published_at IS NOT NULL AND published_at <= now()
     ORDER BY published_at DESC, id DESC LIMIT $1`
  ).all(limit);
  const posts = [];
  for (const row of rows) {
    const decorated = await decoratePost(row);
    const { body, bodyHtml, ...card } = decorated;
    posts.push(card);
  }
  res.json({ posts });
});

publicRouter.get("/posts/:slug", async (req, res) => {
  const row = await db.prepare(
    `SELECT * FROM posts WHERE slug = $1 AND status = 'published'
     AND published_at IS NOT NULL AND published_at <= now()`
  ).get(req.params.slug);
  if (!row) return res.status(404).json({ error: "Post not found" });
  res.json({ post: await decoratePost(row) });
});

/* ---------- Contact form → enquiries ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const contactIps = new Map();

publicRouter.post("/contact", async (req, res) => {
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

  await db.prepare("INSERT INTO enquiries (name, email, message) VALUES ($1, $2, $3)")
    .run(name, email, message);
  contactIps.set(ip, Date.now());
  res.json({ ok: true, message: "Thank you — your message has reached Glen. He replies personally, usually within a day or two." });
});

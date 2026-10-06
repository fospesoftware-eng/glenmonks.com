/* ============================================================
   Content assembly — merges KV section copy with collections
   ============================================================ */
import { db, getKv } from "./db.js";

export const KV_KEYS = [
  "site", "hero", "marquee", "philosophy", "practice",
  "journey", "band", "quote", "library", "contact"
];

export const COLLECTIONS = {
  pillars:   { table: "pillars",   columns: ["letter", "title", "body"], orderBy: "pos" },
  services:  { table: "services",  columns: ["icon", "title", "body"],   orderBy: "pos" },
  steps:     { table: "steps",     columns: ["title", "body"],           orderBy: "pos" },
  resources: { table: "resources", columns: ["tag", "title", "body", "meta", "url", "wide"], orderBy: "pos" }
};

export function listCollection(name) {
  const c = COLLECTIONS[name];
  if (!c) throw new Error("Unknown collection");
  return db.prepare(`SELECT * FROM ${c.table} ORDER BY ${c.orderBy}, id`).all()
    .map((row) => ({ ...row, wide: !!row.wide }));
}

export function buildContent() {
  const out = {};
  for (const key of KV_KEYS) out[key] = getKv(key, {});
  for (const name of Object.keys(COLLECTIONS)) out[name] = listCollection(name);
  return out;
}

export function mediaUrl(row) {
  return row ? `/uploads/${row.filename}` : "";
}

/* Generate/ensure a URL-safe unique slug */
export function slugify(text, exceptId = -1) {
  const base = String(text || "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
  let slug = base;
  let n = 1;
  while (db.prepare("SELECT id FROM posts WHERE slug = ? AND id != ?").get(slug, exceptId)) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

/* ============================================================
   SQLite database — schema, connection and tiny helpers
   Uses Node's built-in node:sqlite (Node >= 22.5), no native build
   ============================================================ */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedDatabase } from "./seed.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = join(__dirname, "..");
export const DATA_DIR = join(SERVER_ROOT, "data");
export const UPLOADS_DIR = join(SERVER_ROOT, "uploads");

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, "glenmonks.db"));
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT NOT NULL UNIQUE,
  pass_hash  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pillars (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  pos   INTEGER NOT NULL DEFAULT 0,
  letter TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  body  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS services (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  pos   INTEGER NOT NULL DEFAULT 0,
  icon  TEXT NOT NULL DEFAULT 'circle',
  title TEXT NOT NULL DEFAULT '',
  body  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS steps (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  pos   INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  body  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS resources (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  pos   INTEGER NOT NULL DEFAULT 0,
  tag   TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  body  TEXT NOT NULL DEFAULT '',
  meta  TEXT NOT NULL DEFAULT '',
  url   TEXT NOT NULL DEFAULT '',
  wide  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL DEFAULT '',
  excerpt        TEXT NOT NULL DEFAULT '',
  body           TEXT NOT NULL DEFAULT '',
  tags           TEXT NOT NULL DEFAULT '',
  cover_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at   TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enquiries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL DEFAULT '',
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_read ON enquiries(is_read);
`);

/* ---------- KV helpers (settings / section copy, stored as JSON) ---------- */
export function getKv(key, fallback = null) {
  const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}

export function setKv(key, value) {
  db.prepare(
    `INSERT INTO kv(key, value) VALUES(?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, JSON.stringify(value));
}

/* Seed on first boot (empty users table) */
const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
if (userCount === 0) {
  seedDatabase();
  console.log("✓ Database seeded with the current site content");
}

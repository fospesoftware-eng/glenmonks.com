/* ============================================================
   PostgreSQL database — schema, connection and tiny helpers
   Connects via DATABASE_URL (Replit Postgres provides this) or
   the PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE env vars.
   ============================================================ */
import "dotenv/config";
import pg from "pg";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedDatabase } from "./seed.js";

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = join(__dirname, "..");
export const DATA_DIR = join(SERVER_ROOT, "data");
export const UPLOADS_DIR = join(SERVER_ROOT, "uploads");

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOADS_DIR, { recursive: true });

const connectionString = process.env.DATABASE_URL;
const sslFromUrl = connectionString?.match(/[?&]sslmode=(\w+)/)?.[1];
const sslMode = process.env.PGSSLMODE || sslFromUrl;

export const pool = new Pool({
  connectionString,
  ssl: sslMode === "require" ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000
});

/* Schema — Postgres dialect
   id: SERIAL auto-increment
   datetime defaults: now()
   booleans stored as INTEGER 0/1 (keeps the admin payload contract) */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  username   TEXT NOT NULL UNIQUE,
  pass_hash  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pillars (
  id     SERIAL PRIMARY KEY,
  pos    INTEGER NOT NULL DEFAULT 0,
  letter TEXT NOT NULL DEFAULT '',
  title  TEXT NOT NULL DEFAULT '',
  body   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS services (
  id    SERIAL PRIMARY KEY,
  pos   INTEGER NOT NULL DEFAULT 0,
  icon  TEXT NOT NULL DEFAULT 'circle',
  title TEXT NOT NULL DEFAULT '',
  body  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS steps (
  id    SERIAL PRIMARY KEY,
  pos   INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  body  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS resources (
  id    SERIAL PRIMARY KEY,
  pos   INTEGER NOT NULL DEFAULT 0,
  tag   TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  body  TEXT NOT NULL DEFAULT '',
  meta  TEXT NOT NULL DEFAULT '',
  url   TEXT NOT NULL DEFAULT '',
  wide  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS media (
  id            SERIAL PRIMARY KEY,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id             SERIAL PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL DEFAULT '',
  excerpt        TEXT NOT NULL DEFAULT '',
  body           TEXT NOT NULL DEFAULT '',
  tags           TEXT NOT NULL DEFAULT '',
  cover_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL DEFAULT '',
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_read ON enquiries(is_read);
`;

/* ---------------- Query shim (keeps the old db.prepare(...).get/.all/.run API) ---------------- */
function prepare(sql) {
  return {
    get: async (...params) => {
      const r = await pool.query(sql, params);
      return r.rows[0] ?? null;
    },
    all: async (...params) => {
      const r = await pool.query(sql, params);
      return r.rows;
    },
    /* For INSERTs that need the new id, include `RETURNING id` in the SQL.
       lastInsertRowid will then be populated. */
    run: async (...params) => {
      const r = await pool.query(sql, params);
      return { lastInsertRowid: r.rows[0]?.id ?? null, changes: r.rowCount };
    }
  };
}

export const db = { prepare };

export async function exec(sql) {
  await pool.query(sql);
}

/* ---------- KV helpers (section copy, stored as JSON text) ---------- */
export async function getKv(key, fallback = null) {
  const row = await prepare("SELECT value FROM kv WHERE key = $1").get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}

export async function setKv(key, value) {
  await prepare(
    `INSERT INTO kv(key, value) VALUES($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`
  ).run(key, JSON.stringify(value));
}

/* Connect, build schema and seed on first boot. Called from index.js. */
export async function initDb() {
  await pool.query(SCHEMA);
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  if (rows[0].n === 0) {
    await seedDatabase();
    console.log("✓ Database seeded with the current site content");
  }
}

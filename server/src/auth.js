/* ============================================================
   Auth — username/password login, opaque session cookie
   ============================================================ */
import { Router } from "express";
import { randomBytes } from "node:crypto";
import { db } from "./db.js";
import { verifyPassword, hashPassword } from "./passwords.js";

export const SESSION_COOKIE = "gm_session";
const SESSION_DAYS = 7;

/* In-memory throttling: slow down credential brute force */
const attempts = new Map();
function clientKey(req) { return req.ip || req.headers["x-forwarded-for"] || "unknown"; }
function rateLimited(ip) {
  const a = attempts.get(ip);
  return a && a.count >= 8 && Date.now() - a.first < 15 * 60 * 1000;
}
function recordFailure(ip) {
  const a = attempts.get(ip) || { count: 0, first: Date.now() };
  a.count += 1; a.first = a.first || Date.now();
  attempts.set(ip, a);
}
function clearFailures(ip) { attempts.delete(ip); }

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)")
    .run(token, userId, expires);
  return { token, expires };
}

export async function getUserFromRequest(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const row = await db.prepare(
    `SELECT u.id, u.username FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()`
  ).get(token);
  return row || null;
}

export const requireAuth = async (req, res, next) => {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not signed in" });
  req.user = user;
  next();
};

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const ip = clientKey(req);
  if (rateLimited(ip)) return res.status(429).json({ error: "Too many attempts — try again in 15 minutes." });

  const username = String(req.body?.username || "").trim().slice(0, 64);
  const password = String(req.body?.password || "").slice(0, 256);
  const user = await db.prepare("SELECT * FROM users WHERE username = $1").get(username);

  if (!user || !verifyPassword(password, user.pass_hash)) {
    recordFailure(ip);
    return res.status(401).json({ error: "Invalid username or password" });
  }
  clearFailures(ip);
  const { token, expires } = await createSession(user.id);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/",
    expires: new Date(expires), maxAge: SESSION_DAYS * 864e5
  });
  res.json({ ok: true, user: { id: user.id, username: user.username } });
});

authRouter.post("/logout", async (req, res) => {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) await db.prepare("DELETE FROM sessions WHERE token = $1").run(token);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

authRouter.put("/password", requireAuth, async (req, res) => {
  const current = String(req.body?.currentPassword || "");
  const next = String(req.body?.newPassword || "");
  if (next.length < 10) return res.status(400).json({ error: "New password must be at least 10 characters" });
  const user = await db.prepare("SELECT * FROM users WHERE id = $1").get(req.user.id);
  if (!verifyPassword(current, user.pass_hash)) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }
  await db.prepare("UPDATE users SET pass_hash = $1 WHERE id = $2").run(hashPassword(next), req.user.id);
  // Sign out everywhere after a password change
  await db.prepare("DELETE FROM sessions WHERE user_id = $1").run(req.user.id);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true, reauth: true });
});

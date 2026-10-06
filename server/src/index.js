/* ============================================================
   Glen Monks CMS — server entry point
   Serves the static website, the public API, the admin panel
   and uploaded media from one process.

   Run:  npm start     (from the server/ directory)
   ============================================================ */
import express from "express";
import { join } from "node:path";
import { SERVER_ROOT, UPLOADS_DIR, initDb } from "./db.js";
import { publicRouter } from "./api-public.js";
import { adminRouter } from "./api-admin.js";
import { authRouter } from "./auth.js";

const SITE_ROOT = join(SERVER_ROOT, "..");
const ADMIN_DIR = join(SERVER_ROOT, "public", "admin");
const PORT = process.env.PORT || 4700;

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

/* API (before static so unknown API routes get JSON 404s) */
app.use("/api", publicRouter);
app.use("/api/admin", authRouter);
app.use("/api/admin", adminRouter);

/* Uploaded media — PDFs and images render in the browser */
app.use("/uploads", express.static(UPLOADS_DIR, {
  maxAge: "7d",
  setHeaders(res) { res.setHeader("Content-Disposition", "inline"); }
}));

/* Admin panel */
app.use("/admin", express.static(ADMIN_DIR, { index: "index.html" }));
app.get("/admin/*", (_req, res) => res.sendFile(join(ADMIN_DIR, "index.html")));

/* The static website (project root) */
app.use(express.static(SITE_ROOT, {
  extensions: ["html"],
  setHeaders(res, path) {
    if (path.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
  }
}));

/* JSON 404 for stray API calls */
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

/* Error handler (multer upload errors etc.) */
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 400).json({ error: err.message || "Server error" });
});

/* Connect to Postgres, build schema and seed before serving traffic */
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n  Glen Monks CMS running (PostgreSQL)`);
      console.log(`  → Website:  http://localhost:${PORT}/`);
      console.log(`  → Admin:    http://localhost:${PORT}/admin`);
      console.log(`  Default login: admin / glenmonks2026 (change it in Settings)\n`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialise database:", err.message);
    process.exit(1);
  });

// server/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import marinas from "./routes/marinas.js";
import vendors from "./routes/vendors.js";
import boats from "./routes/boats.js";
import activity from "./routes/activity.js";
import economics from "./routes/economics.js";

const app = express();

/* --- Hosting/proxy hygiene --- */
app.set("trust proxy", 1); // important on Render/Heroku/etc. for correct IPs & HTTPS

/* --- CORS --- */
// CORS_ORIGIN can be a comma-separated list: "https://a.com,https://b.com"
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(s => s.trim()).filter(Boolean)
  : true; // allow all in absence of env (useful for quick tests)
app.use(cors({ origin: allowedOrigins, credentials: true }));

/* --- Parsers & logs --- */
app.use(express.json());
app.use(morgan("dev"));

/* --- Health & root handlers (avoid HEAD/404 noise) --- */
app.get("/", (_req, res) => res.status(200).send("OK"));
app.head("/", (_req, res) => res.sendStatus(200));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/healthz", (_req, res) => res.json({ ok: true })); // optional: set Render health check here

/* --- API routes --- */
app.use("/api/marinas", marinas);
app.use("/api/vendors", vendors);
app.use("/api/boats", boats);
app.use("/api/activity", activity);
app.use("/api/economics", economics);

/* --- 404 JSON for unknown routes (after all routers) --- */
app.use((req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

/* --- Central error handler (helps catch 502 root causes) --- */
app.use((err, req, res, _next) => {
  console.error("Request error:", {
    method: req.method,
    path: req.originalUrl,
    message: err?.message,
    stack: err?.stack,
  });
  res.status(500).json({ error: "Internal Server Error" });
});

/* --- Start --- */
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

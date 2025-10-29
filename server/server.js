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
import tenant from "./middlewares/tenant.js"; // sets req.tenant_id & req.tenantId

const app = express();

/* --- Proxy hygiene --- */
app.set("trust proxy", 1);

/* --- CORS --- */
// CORS_ORIGIN can be comma-separated
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));

/* --- Parsers & logs --- */
app.use(express.json());
app.use(morgan("dev"));

/* --- Health --- */
app.get("/", (_req, res) => res.type("text/plain").send("OK"));

/* --- Routes --- */
app.use("/api/marinas", marinas);
app.use("/api/vendors", vendors);
app.use("/api/boats", boats);

// activity router already uses tenantGuard internally, keep as-is
app.use("/api/activity", activity);

// ✅ economics router requires req.tenant_id, so wrap it with tenant middleware
app.use("/api/economics", tenant, economics);

/* --- Error guard (last) --- */
app.use((err, req, res, _next) => {
  console.error("Unhandled error", {
    method: req.method,
    path: req.originalUrl,
    message: err?.message,
    stack: err?.stack,
  });
  res.status(500).json({ error: "Internal Server Error" });
});

/* --- Start --- */
const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Server listening on :${port}`);
});

export default app;

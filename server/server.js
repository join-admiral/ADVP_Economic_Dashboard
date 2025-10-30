// server/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

// middleware & routes (ensure these paths are correct from THIS file)
import tenant from "./middlewares/tenant.js";
import marinas from "./routes/marinas.js";
import vendors from "./routes/vendors.js";
import boats from "./routes/boats.js";
import activity from "./routes/activity.js";
import economics from "./routes/economics.js";

const app = express();

app.set("trust proxy", 1);
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map(s => s.trim()).filter(Boolean)
    : true,
  credentials: true
}));
app.use(express.json());
app.use(morgan("dev"));

// Health check (set Render Health Check Path to "/")
app.get("/", (_req, res) => res.status(200).send("OK"));

/* order: tenant middleware before routes */
app.use(tenant);

// Routes
app.use("/api/marinas", marinas);
app.use("/api/vendors", vendors);
app.use("/api/boats", boats);
app.use("/api/activity", activity);
app.use("/api/economics", economics);

// Error handler (keep at bottom)
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", {
    method: req.method,
    path: req.originalUrl,
    message: err?.message,
    stack: err?.stack,
  });
  res.status(500).json({ error: "Internal Server Error" });
});

// Start
const port = Number(process.env.PORT) || 4000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on ${port}`);
});

export default app;

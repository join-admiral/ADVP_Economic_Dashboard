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
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/marinas", marinas);
app.use("/api/vendors", vendors);
app.use("/api/boats", boats);
app.use("/api/activity", activity);
app.use("/api/economics", economics);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

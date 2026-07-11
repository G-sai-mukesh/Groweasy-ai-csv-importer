import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { csvRouter } from "./routes/csv.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// deployed behind a single reverse proxy (Render/Railway/Vercel etc) - without
// this, express-rate-limit sees the proxy's IP for every request and all
// users end up sharing one rate-limit bucket instead of getting their own
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
  })
);
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());

const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many import requests. Please try again later." },
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/csv", importLimiter, csvRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`GrowEasy CSV Importer API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

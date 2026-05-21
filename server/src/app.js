import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { clerkMiddleware } from "@clerk/express";
import healthRouter from "./routes/health.js";
import routes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://*.clerk.accounts.dev", "https://cdn.jsdelivr.net"],
        scriptSrcElem: ["'self'", "'unsafe-inline'", "https://*.clerk.accounts.dev", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", "https://*.clerk.accounts.dev", "https://api.clerk.dev"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        frameSrc: ["'self'", "https://*.clerk.accounts.dev"],
        workerSrc: ["'self'", "blob:"],
      },
    },
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Health check bypasses Clerk (no auth required, needed for uptime monitors)
app.use("/api/health", healthRouter);

// Attaches Clerk auth state to req; does not block unauthenticated requests
app.use(clerkMiddleware());

// Serve uploaded media files
app.use("/uploads", express.static(resolve(__dirname, "../uploads")));

app.use("/api", routes);

// Serve React client in production
const clientDist = resolve(__dirname, "../../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(resolve(clientDist, "index.html"));
  });
}

app.use(errorHandler);

export default app;

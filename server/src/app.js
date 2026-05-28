import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import axios from "axios";
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
        connectSrc: ["'self'", "https://*.clerk.accounts.dev", "https://api.clerk.dev", "https://api.iconify.design", "https://app.churchpost.social"],
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
    origin: (origin, callback) => {
      const allowed = [
        process.env.CLIENT_URL || "http://localhost:5173",
        "http://localhost:5173",
      ];
      if (!origin || allowed.includes(origin) || /^https:\/\/[^.]+\.churchpost\.social$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
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

// Public image proxy — serves R2/CDN images with CORS headers so Fabric.js canvas can load them
// Restricted to .r2.dev and .r2.cloudflarestorage.com domains only
app.get("/api/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url || !/^https:\/\/[^/]*\.(r2\.dev|r2\.cloudflarestorage\.com)\//.test(url)) {
    return res.status(400).json({ error: "Invalid or missing url — only R2 URLs are supported" });
  }
  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    const contentType = response.headers["content-type"] || "image/png";
    res.set({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    });
    res.send(Buffer.from(response.data));
  } catch (err) {
    console.error("[proxy-image]", err.message);
    res.status(502).json({ error: "Failed to fetch image" });
  }
});

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

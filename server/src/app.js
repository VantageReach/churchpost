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
        scriptSrc: ["'self'", "'unsafe-inline'", "https://*.clerk.accounts.dev", "https://*.churchpost.social", "https://cdn.jsdelivr.net"],
        scriptSrcElem: ["'self'", "'unsafe-inline'", "https://*.clerk.accounts.dev", "https://*.churchpost.social", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", "https://*.clerk.accounts.dev", "https://api.clerk.dev", "https://*.churchpost.social", "https://*.clerk.services", "https://api.iconify.design"],
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

// Serve privacy & terms as static HTML so they load without JavaScript
// (required for Google OAuth and TikTok app review verification)
function legalPage(title, bodyHtml, backHref, backLabel) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — ChurchPost</title><style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAFAF7;color:#374151;margin:0;padding:4rem 1rem}main{max-width:48rem;margin:0 auto}h1{font-size:2rem;font-weight:700;color:#111827;margin-bottom:.25rem}h2{font-size:1.1rem;font-weight:600;color:#111827;margin:1.5rem 0 .5rem}h3{font-size:.95rem;font-weight:600;color:#1f2937;margin:1rem 0 .25rem}p,li{line-height:1.7;margin:.5rem 0}ul{padding-left:1.25rem}a{color:#4f46e5}hr{border:none;border-top:1px solid #e5e7eb;margin:2.5rem 0}.meta{font-size:.8rem;color:#6b7280;margin-bottom:2.5rem}</style></head><body><main><h1>${title}</h1><div class="meta">Last updated: May 19, 2026</div>${bodyHtml}<hr><a href="${backHref}">${backLabel} →</a></main></body></html>`;
}

const PRIVACY_BODY = `<h2>1. Introduction</h2><p>ChurchPost ("we," "our," or "us") is a social media scheduling platform designed for churches and faith-based organizations. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service at churchpost.social.</p><p>By using ChurchPost, you agree to the collection and use of information in accordance with this policy.</p><h2>2. Information We Collect</h2><h3>Account Information</h3><p>When you create an account, we collect your name, email address, and authentication credentials managed through Clerk, our identity provider.</p><h3>Social Media Tokens</h3><p>To publish content on your behalf, we collect and securely store OAuth access tokens for connected platforms including Facebook, Instagram, YouTube, and TikTok. These tokens are encrypted at rest.</p><h3>Content and Media</h3><p>We store post content and media files you upload. Media files are stored in Cloudflare R2 cloud storage.</p><h3>Usage Data</h3><p>We collect information about how you use the service to improve our product and diagnose issues.</p><h2>3. How We Use Your Information</h2><ul><li>To publish scheduled posts to connected social media platforms on your behalf</li><li>To generate AI-powered content suggestions</li><li>To sync Planning Center events and service information</li><li>To send transactional emails related to your account and post status</li><li>To provide customer support and respond to inquiries</li><li>To improve, maintain, and secure the platform</li><li>To comply with legal obligations</li></ul><h2>4. How We Share Your Information</h2><p>We do not sell your personal information. We share data only in the following circumstances:</p><ul><li><strong>Social Media Platforms:</strong> Content you schedule is transmitted to Facebook, Instagram, YouTube, and TikTok using their official APIs when you authorize publishing.</li><li><strong>Service Providers:</strong> We use Clerk (authentication), Cloudflare R2 (media storage), Neon (database), Railway (hosting), and Anthropic (AI content generation).</li><li><strong>Legal Requirements:</strong> We may disclose information if required by law.</li></ul><h2>5. Data Retention</h2><p>We retain your account data and post history for as long as your account is active. You may request deletion of your data at any time by contacting us.</p><h2>6. Data Security</h2><p>We implement encryption of sensitive data at rest, HTTPS for all data in transit, and access controls. No method of transmission is 100% secure.</p><h2>7. Your Rights</h2><ul><li>Access the personal data we hold about you</li><li>Request correction of inaccurate data</li><li>Request deletion of your data</li><li>Disconnect any connected social media platform at any time through Settings</li></ul><p>To exercise these rights, contact us at privacy@churchpost.social.</p><h2>8. Children's Privacy</h2><p>ChurchPost is not directed to children under 13. We do not knowingly collect personal information from children under 13.</p><h2>9. Changes to This Policy</h2><p>We may update this Privacy Policy from time to time. Your continued use of the service after changes constitutes acceptance of the updated policy.</p><h2>10. Google API Services — Limited Use Disclosure</h2><p>ChurchPost's use of information received from Google APIs, including YouTube Data API and YouTube Analytics API, will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>, including the Limited Use requirements.</p><p>Specifically, ChurchPost:</p><ul><li>Uses Google user data only to provide the features described in this policy (publishing YouTube videos and displaying YouTube analytics to the authenticated user)</li><li>Does not use Google user data for advertising or to train AI/ML models</li><li>Does not share or transfer Google user data to third parties except as necessary to provide the service or as required by law</li><li>Stores Google OAuth tokens encrypted at rest and transmits them only over HTTPS</li><li>Allows users to revoke Google access at any time through Settings → Platforms</li></ul><h2>11. Contact Us</h2><p><strong>ChurchPost</strong><br>Email: privacy@churchpost.social<br>Website: churchpost.social</p>`;

const TERMS_BODY = `<h2>1. Acceptance of Terms</h2><p>By accessing or using ChurchPost ("the Service") at churchpost.social, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p><h2>2. Description of Service</h2><p>ChurchPost is a social media scheduling and management platform for churches and faith-based organizations, allowing users to schedule posts, generate AI content suggestions, sync Planning Center data, and manage media assets.</p><h2>3. Account Registration and Security</h2><p>You agree to provide accurate information, maintain account security, and accept responsibility for all activity under your account.</p><h2>4. Acceptable Use</h2><p>You agree not to post unlawful or harmful content, violate applicable laws, infringe intellectual property rights, or use the Service in ways that damage or impair it.</p><h2>5. Connected Social Media Platforms</h2><p>By connecting social media platforms, you authorize ChurchPost to publish content on your behalf and agree to comply with each platform's terms of service. You may disconnect any platform at any time through Settings.</p><h2>6. Content and Intellectual Property</h2><p>You retain ownership of all content you create and upload. You grant ChurchPost a limited license to store and transmit your content to provide the Service. You are responsible for reviewing all AI-generated suggestions before publishing.</p><h2>7. Subscription and Billing</h2><p>Paid plans are billed in advance and fees are non-refundable except as required by law. We reserve the right to change pricing with reasonable notice.</p><h2>8. Privacy</h2><p>Your use of ChurchPost is governed by our <a href="/privacy">Privacy Policy</a>, incorporated into these Terms by reference.</p><h2>9. Disclaimers and Limitation of Liability</h2><p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. OUR TOTAL LIABILITY FOR ANY CLAIMS SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM.</p><h2>10. Indemnification</h2><p>You agree to hold ChurchPost harmless from claims arising from your use of the Service, your content, or your violation of these Terms.</p><h2>11. Termination</h2><p>We may suspend or terminate your account if you violate these Terms. You may terminate your account by contacting us.</p><h2>12. Governing Law</h2><p>These Terms are governed by the laws of the State of Texas.</p><h2>13. Contact Us</h2><p><strong>ChurchPost</strong><br>Email: legal@churchpost.social<br>Website: churchpost.social</p>`;

app.get("/privacy", (_req, res) => res.send(legalPage("Privacy Policy", PRIVACY_BODY, "/terms", "View Terms of Service")));
app.get("/terms", (_req, res) => res.send(legalPage("Terms of Service", TERMS_BODY, "/privacy", "View Privacy Policy")));

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

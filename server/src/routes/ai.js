import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { requireOrgRole } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { getUpcomingEntries } from "../lib/nationalCalendar.js";
import { redisConnection } from "../lib/redis.js";

const router = Router();

// Lazily created so dotenv has already run by the time the first request hits
function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in .env");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function getOrgSystemPrompt(orgId) {
  const settings = await prisma.orgSettings.findUnique({
    where: { organizationId: orgId },
  });
  return (
    settings?.aiSystemPrompt ||
    "You are a social media assistant for a Christian church. Write warm, welcoming, and inclusive content."
  );
}

// POST /api/ai/suggest — returns 4 suggestions as JSON (non-streaming)
router.post("/suggest", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    const { topic, platforms = ["facebook", "instagram"], tone } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: "topic is required" });

    const systemPrompt = await getOrgSystemPrompt(req.org.id);
    const toneNote = tone ? ` Tone: ${tone}.` : "";

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate 4 social media post captions for: "${topic}".
Platforms: ${platforms.join(", ")}.${toneNote}

Return ONLY a valid JSON array with exactly 4 objects, each with:
- "caption": post text with relevant emojis, varied length and style
- "hashtags": array of 3-5 hashtag strings (no # symbol)
- "platforms": array of platform names this works best for

No markdown, no explanation. Only the JSON array.`,
        },
      ],
    });

    const raw = message.content[0].text.trim();
    let suggestions;
    try {
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      suggestions = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON", raw });
    }

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/stream — streams a single caption token-by-token via SSE
router.post("/stream", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    const { topic, platform = "facebook", tone, existingCaption } = req.body;
    if (!topic?.trim() && !existingCaption?.trim()) {
      return res.status(400).json({ error: "topic or existingCaption is required" });
    }

    const systemPrompt = await getOrgSystemPrompt(req.org.id);

    const userContent = existingCaption?.trim()
      ? `Rewrite and improve this social media caption for ${platform}. Make it more engaging, add relevant emojis, and keep the core message:

"${existingCaption}"
${tone ? `\nTone: ${tone}` : ""}

Write only the caption text. No explanation, no quotes around it.`
      : `Write a single social media caption for ${platform} about: "${topic}".
${tone ? `Tone: ${tone}.` : ""}
Include relevant emojis. Write only the caption text. No explanation, no quotes.`;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
    res.flushHeaders();

    const stream = await getAnthropic().messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    // If headers not sent yet, use normal error handler
    if (!res.headersSent) return next(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// GET /api/ai/proactive — AI-generated content ideas based on upcoming calendar events
router.get("/proactive", requireOrgRole("ORG_ADMIN", "EDITOR", "VIEWER"), async (req, res, next) => {
  try {
    const now = new Date();
    const forceRefresh = req.query.refresh === "1";

    // Daily cache key — suggestions don't change within a day
    const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const cacheKey = `proactive:${req.org.id}:${dateKey}`;

    if (!forceRefresh) {
      try {
        const cached = await redisConnection.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      } catch { /* Redis unavailable — fall through to live compute */ }
    }
    const in30 = new Date(now.getTime() + 30 * 86400_000);

    const [settings, pcEvents, gcalEvents, scheduledPosts] = await Promise.all([
      prisma.orgSettings.findUnique({ where: { organizationId: req.org.id } }),
      prisma.planningCenterEvent.findMany({
        where: { organizationId: req.org.id, startsAt: { gte: now, lte: in30 } },
        orderBy: { startsAt: "asc" },
        take: 15,
      }),
      prisma.googleCalendarEvent.findMany({
        where: { organizationId: req.org.id, startsAt: { gte: now, lte: in30 } },
        orderBy: { startsAt: "asc" },
        take: 15,
      }),
      prisma.post.findMany({
        where: {
          organizationId: req.org.id,
          status: { in: ["SCHEDULED", "DRAFT"] },
          scheduledAt: { gte: now, lte: new Date(now.getTime() + 14 * 86400_000) },
        },
        select: { scheduledAt: true, platforms: true },
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

    const hasGap = scheduledPosts.length < 3;
    const upcomingCount = scheduledPosts.length;

    // Build filter object from org settings
    const calendarFilters = {
      holidays: settings?.nationalCalendarHolidays ?? true,
      liturgical: settings?.nationalCalendarLiturgical ?? true,
      awareness: settings?.nationalCalendarAwareness ?? true,
      fun: settings?.nationalCalendarFun ?? true,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // National calendar events for next 30 days
    const nationalEvents = getUpcomingEntries(new Date(), 30, calendarFilters).map((e) => {
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      return {
        type: "national",
        label: e.label,
        emoji: e.emoji,
        daysUntil: Math.round((eventDate - today) / 86400_000),
        hint: e.suggestTopics?.slice(0, 2).join(", ") || null,
      };
    });

    // Planning Center events
    const pcItems = pcEvents.map((ev) => ({
      type: "church",
      label: ev.title,
      emoji: "⛪",
      daysUntil: ev.startsAt ? Math.max(0, Math.round((new Date(ev.startsAt) - today) / 86400_000)) : null,
      hint: ev.description?.slice(0, 100) || null,
      source: ev.source || "planning_center",
    })).filter((e) => e.daysUntil !== null);

    // Google Calendar events
    const gcalItems = gcalEvents.map((ev) => ({
      type: "church",
      label: ev.title,
      emoji: "📅",
      daysUntil: ev.startsAt ? Math.max(0, Math.round((new Date(ev.startsAt) - today) / 86400_000)) : null,
      hint: ev.description?.slice(0, 100) || null,
      source: "google_calendar",
    })).filter((e) => e.daysUntil !== null);

    // Combine all sources, deduplicate by label, sort soonest first, cap at 12
    const seen = new Set();
    const allEvents = [...nationalEvents, ...pcItems, ...gcalItems]
      .filter((e) => {
        const key = e.label.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 12);

    // Keep pcEvents shape for frontend backward-compat
    const allEventItems = [...pcItems, ...gcalItems]
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 10)
      .map(({ label, source, daysUntil, hint }) => ({ title: label, source, daysUntil, description: hint }));

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({
        suggestions: allEvents.slice(0, 3).map((e) => ({
          eventLabel: e.label,
          eventEmoji: e.emoji,
          daysUntil: e.daysUntil,
          topic: e.hint || e.label,
          caption: `Add your ANTHROPIC_API_KEY to enable AI-generated suggestions for ${e.label}.`,
          hashtags: ["church", "community"],
          platforms: ["facebook", "instagram"],
        })),
        pcEvents: allEventItems,
        hasGap,
        upcomingCount,
      });
    }

    const systemPrompt =
      settings?.aiSystemPrompt ||
      "You are a social media assistant for a Christian church. Write warm, welcoming content.";

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[today.getDay()];

    const dayRhythm = {
      Sunday:    { emoji: "🙏", label: "Sunday Post", hint: "Worship content, sermon highlights, or gratitude for today's service" },
      Monday:    { emoji: "💪", label: "Monday Motivation", hint: "New week inspiration or reflection on Sunday's message" },
      Tuesday:   { emoji: "📖", label: "Midweek Word", hint: "Bible verse, devotional thought, or midweek encouragement" },
      Wednesday: { emoji: "🤝", label: "Midweek Connection", hint: "Small groups, Bible study, or community highlight" },
      Thursday:  { emoji: "🔔", label: "Sunday Preview", hint: "Tease this Sunday's topic, speaker, or special event" },
      Friday:    { emoji: "🎉", label: "Friday Invite", hint: "Weekend energy — invite people to join this Sunday" },
      Saturday:  { emoji: "⛪", label: "Church Invite", hint: "Direct invite to join tomorrow's service with time and location" },
    };

    const dayEntry = dayRhythm[dayName];

    const todayEvents = allEvents.filter((e) => e.daysUntil === 0);
    const todayNote = todayEvents.length
      ? `IMPORTANT: ${todayEvents.map((e) => `${e.emoji} ${e.label}`).join(" and ")} is TODAY. Put this first in your response and make the caption timely and ready to post immediately.\n\n`
      : "";

    const eventList = allEvents
      .map((e, i) => {
        const when = e.daysUntil === 0 ? "TODAY" : e.daysUntil === 1 ? "tomorrow" : `in ${e.daysUntil} days`;
        const hint = e.hint ? ` — ${e.hint}` : "";
        return `${i + 1}. ${e.emoji} ${e.label} (${when})${hint}`;
      })
      .join("\n");

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${todayNote}Today is ${dayName}. Here are upcoming events for the next 30 days:

${eventList}

${hasGap ? `Note: this church has only ${upcomingCount} post${upcomingCount !== 1 ? "s" : ""} scheduled in the next 14 days — they could use more content.` : ""}

Generate one social media post idea for EACH event listed above, PLUS one additional post idea that fits today being ${dayName} (${dayEntry.hint}). Put the day-of-week post last unless today also has a calendar event. Return ONLY a valid JSON array with objects containing:
- "eventLabel": the event name (use "${dayEntry.label}" for the day-of-week post)
- "eventEmoji": the emoji
- "daysUntil": days until the event (0 for today's day-of-week post)
- "topic": a one-line content angle (not the caption itself)
- "caption": a ready-to-use social media caption with emojis (1-3 sentences)
- "hashtags": 3-4 hashtag strings (no # symbol)
- "platforms": ["facebook", "instagram"] (or others if more appropriate)

No markdown, no explanation. Only the JSON array.`,
        },
      ],
    });

    const raw = message.content[0].text.trim();
    let suggestions;
    try {
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      suggestions = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON", raw });
    }

    const payload = { suggestions, pcEvents: allEventItems, hasGap, upcomingCount };

    // Cache until midnight — TTL = seconds remaining today
    try {
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const ttl = Math.max(60, Math.floor((midnight - now) / 1000));
      await redisConnection.setex(cacheKey, ttl, JSON.stringify(payload));
    } catch { /* Redis unavailable — skip cache write */ }

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/generate-image — generate a background image via Gemini
router.post("/generate-image", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt is required" });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "GEMINI_API_KEY is not configured. Add it to your Railway environment variables." });
    }

    const enhancedPrompt = `${prompt.trim()}. High quality, visually striking image suitable for a Christian church social media post. Uplifting, professional aesthetic.`;

    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: enhancedPrompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      },
      { timeout: 60000 }
    );

    const parts = geminiRes.data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    if (!imagePart) {
      console.error("[AI Image] No image in response:", JSON.stringify(geminiRes.data).slice(0, 300));
      return res.status(500).json({ error: "Image generation returned no result. Try rephrasing your prompt." });
    }

    // Return as data URL — avoids CORS/tainted-canvas issues with Fabric.js
    res.json({ url: `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}` });
  } catch (err) {
    const googleErr = err?.response?.data?.error;
    const detail = googleErr?.message || err.message;
    const status = err?.response?.status;
    console.error("[AI Image] status:", status, "error:", JSON.stringify(googleErr ?? err.message));
    return res.status(500).json({ error: `Image generation failed: ${detail}` });
  }
});

// GET /api/ai/models — list available Gemini models (temporary public diagnostic — remove after debugging)
router.get("/models", async (req, res, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "GEMINI_API_KEY not set" });
    const { data } = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
      { timeout: 15000 }
    );
    res.json({
      total: data.models?.length,
      models: (data.models ?? []).map((m) => ({ name: m.name, methods: m.supportedGenerationMethods })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/stats — post counts by status for dashboard
router.get("/stats", async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [published, scheduled, drafts, failed, upcoming] = await Promise.all([
      prisma.post.count({
        where: {
          organizationId: req.org.id,
          status: "PUBLISHED",
          publishedAt: { gte: startOfMonth },
        },
      }),
      prisma.post.count({
        where: { organizationId: req.org.id, status: "SCHEDULED" },
      }),
      prisma.post.count({
        where: { organizationId: req.org.id, status: "DRAFT" },
      }),
      prisma.post.count({
        where: { organizationId: req.org.id, status: { in: ["FAILED", "PARTIAL"] } },
      }),
      prisma.post.findMany({
        where: {
          organizationId: req.org.id,
          status: "SCHEDULED",
          scheduledAt: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: { mediaAssets: true },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
    ]);

    res.json({ published, scheduled, drafts, failed, upcoming });
  } catch (err) {
    next(err);
  }
});

export default router;

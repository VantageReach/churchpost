import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { requireOrgRole } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { getUpcomingEntries } from "../../../shared/nationalCalendar.js";

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
    const [settings, pcEvents] = await Promise.all([
      prisma.orgSettings.findUnique({ where: { organizationId: req.org.id } }),
      prisma.planningCenterEvent.findMany({
        where: { organizationId: req.org.id, startsAt: { gte: new Date(), lte: new Date(Date.now() + 21 * 86400_000) } },
        orderBy: { startsAt: "asc" },
        take: 8,
      }),
    ]);

    // Build filter object from org settings
    const calendarFilters = {
      holidays: settings?.nationalCalendarHolidays ?? true,
      liturgical: settings?.nationalCalendarLiturgical ?? true,
      awareness: settings?.nationalCalendarAwareness ?? true,
      fun: settings?.nationalCalendarFun ?? true,
    };

    // Get upcoming events for next 21 days
    const upcomingEvents = getUpcomingEntries(new Date(), 21, calendarFilters);

    // Check posting gaps — days with no scheduled posts in next 14 days
    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const scheduledPosts = await prisma.post.findMany({
      where: {
        organizationId: req.org.id,
        status: { in: ["SCHEDULED", "DRAFT"] },
        scheduledAt: { gte: now, lte: in14 },
      },
      select: { scheduledAt: true, platforms: true },
      orderBy: { scheduledAt: "asc" },
    });

    const hasGap = scheduledPosts.length < 3;
    const upcomingCount = scheduledPosts.length;

    // Compute daysUntil for each event
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const withDays = upcomingEvents.map((e) => {
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((eventDate - today) / (1000 * 60 * 60 * 24));
      return { ...e, daysUntil };
    });

    // Build PC events list (max 5, labeled with source)
    const pcEventItems = pcEvents.slice(0, 5).map((ev) => {
      const daysUntil = ev.startsAt
        ? Math.max(0, Math.round((new Date(ev.startsAt) - today) / 86400_000))
        : null;
      return { title: ev.title, source: ev.source, daysUntil, description: ev.description };
    });

    // Pick top 5 national calendar events to generate ideas for
    const featuredEvents = withDays.slice(0, 5);

    if (!process.env.ANTHROPIC_API_KEY) {
      // Return stub suggestions when no API key
      return res.json({
        suggestions: withDays.slice(0, 3).map((e) => ({
          eventLabel: e.label,
          eventEmoji: e.emoji,
          daysUntil: e.daysUntil,
          topic: e.suggestTopics?.[0] || e.label,
          caption: `Add your ANTHROPIC_API_KEY to enable AI-generated suggestions for ${e.label}.`,
          hashtags: ["church", "community"],
          platforms: ["facebook", "instagram"],
        })),
        pcEvents: pcEventItems,
        hasGap,
        upcomingCount,
      });
    }

    const systemPrompt =
      settings?.aiSystemPrompt ||
      "You are a social media assistant for a Christian church. Write warm, welcoming content.";

    const nationalList = featuredEvents
      .map(
        (e, i) =>
          `${i + 1}. ${e.emoji} ${e.label} — in ${e.daysUntil} day${e.daysUntil !== 1 ? "s" : ""} (topics: ${e.suggestTopics?.slice(0, 2).join(", ")})`
      )
      .join("\n");

    const pcList = pcEventItems.length
      ? "\n\nYour church's upcoming events from Planning Center:\n" +
        pcEventItems
          .map((ev, i) => `${i + 1}. "${ev.title}" (${ev.source})${ev.daysUntil != null ? ` — in ${ev.daysUntil} day${ev.daysUntil !== 1 ? "s" : ""}` : ""}${ev.description ? `: ${ev.description.slice(0, 80)}` : ""}`)
          .join("\n")
      : "";

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here are upcoming calendar events for the next 21 days:

${nationalList}${pcList}

${hasGap ? `Note: this church has only ${upcomingCount} post${upcomingCount !== 1 ? "s" : ""} scheduled in the next 14 days — they could use more content.` : ""}

Generate one concise social media post idea for each national calendar event listed above. Return ONLY a valid JSON array with objects containing:
- "eventLabel": the event name exactly as given
- "eventEmoji": the emoji from the event
- "daysUntil": number of days until the event
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

    res.json({ suggestions, pcEvents: pcEventItems, hasGap, upcomingCount });
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

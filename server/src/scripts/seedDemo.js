/**
 * Seeds a demo organization with sample posts, team members, and platform accounts.
 *
 * Usage:
 *   node src/scripts/seedDemo.js
 *
 * Pass the Clerk user ID to attach an existing Clerk account as the demo admin:
 *   node src/scripts/seedDemo.js user_2abc123
 *
 * If no Clerk ID is provided the seed still runs — the org is created with a
 * placeholder author. When a real user logs into demo.churchpost.social their
 * OrgUser record is created automatically and they see all the sample content.
 */

import prisma from "../lib/prisma.js";

const CLERK_ID = process.argv[2] ?? "demo-seed-placeholder";

const NOW = new Date();
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000);
const daysFromNow = (n) => new Date(NOW.getTime() + n * 86400000);

async function main() {
  console.log("Seeding demo organization…");

  // ── 1. Organization ────────────────────────────────────────────────────────
  let org = await prisma.organization.findUnique({ where: { slug: "demo" } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Demo Church",
        slug: "demo",
        plan: "PRO",
        isDemo: true,
      },
    });
    console.log("  Created org:", org.id);
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { isDemo: true, plan: "PRO" },
    });
    console.log("  Found existing org:", org.id);
  }

  // ── 2. OrgSettings ─────────────────────────────────────────────────────────
  const existingSettings = await prisma.orgSettings.findUnique({
    where: { organizationId: org.id },
  });
  if (!existingSettings) {
    await prisma.orgSettings.create({
      data: {
        organizationId: org.id,
        brandPrimaryColor: "#1D4ED8",
        brandSecondaryColor: "#3B82F6",
        brandTextOnPrimary: "#ffffff",
        brandFontFamily: "Nunito",
        timezone: "America/Chicago",
        aiSystemPrompt:
          "You are a social media assistant for a Christian church. Write warm, welcoming, and inclusive content. Avoid religious jargon. Posts should feel community-focused, genuine, and encouraging. Never use clickbait language.",
        nationalCalendarHolidays: true,
        nationalCalendarAwareness: true,
        nationalCalendarLiturgical: true,
        nationalCalendarFun: true,
        proactiveSuggestions: true,
      },
    });
    console.log("  Created OrgSettings");
  }

  // ── 3. OrgUser (seed author) ───────────────────────────────────────────────
  let author = await prisma.orgUser.findUnique({
    where: { organizationId_clerkId: { organizationId: org.id, clerkId: CLERK_ID } },
  });
  if (!author) {
    author = await prisma.orgUser.create({
      data: {
        organizationId: org.id,
        clerkId: CLERK_ID,
        name: CLERK_ID === "demo-seed-placeholder" ? "Demo Admin" : "Demo Admin",
        email: "demo@churchpost.social",
        role: "ORG_ADMIN",
      },
    });
    console.log("  Created OrgUser:", author.id);
  }

  // Seed a couple of additional fake team members for display
  const fakeMembers = [
    { clerkId: "demo-seed-member-1", name: "Sarah Mitchell", email: "sarah@democc.org", role: "EDITOR" },
    { clerkId: "demo-seed-member-2", name: "James Okonkwo", email: "james@democc.org", role: "EDITOR" },
  ];
  for (const m of fakeMembers) {
    const exists = await prisma.orgUser.findUnique({
      where: { organizationId_clerkId: { organizationId: org.id, clerkId: m.clerkId } },
    });
    if (!exists) {
      await prisma.orgUser.create({ data: { organizationId: org.id, ...m } });
      console.log("  Created team member:", m.name);
    }
  }

  // ── 4. Platform Accounts (fake, display-only) ──────────────────────────────
  const fakePlatforms = [
    {
      platform: "facebook",
      accountName: "Demo Community Church",
      accountId: "demo-fb-page-id",
      accessToken: "demo-access-token",
    },
    {
      platform: "instagram",
      accountName: "@democommunitychurch",
      accountId: "demo-ig-id",
      accessToken: "demo-access-token",
    },
    {
      platform: "twitter",
      accountName: "@DemoCC",
      accountId: "demo-twitter-id",
      accessToken: "demo-access-token",
    },
  ];
  for (const p of fakePlatforms) {
    const exists = await prisma.platformAccount.findUnique({
      where: { organizationId_platform: { organizationId: org.id, platform: p.platform } },
    });
    if (!exists) {
      await prisma.platformAccount.create({ data: { organizationId: org.id, ...p } });
      console.log("  Created platform account:", p.platform);
    }
  }

  // ── 5. Sample Posts ────────────────────────────────────────────────────────
  const existingCount = await prisma.post.count({ where: { organizationId: org.id } });
  if (existingCount > 0) {
    console.log(`  Posts already exist (${existingCount}), skipping`);
  } else {
    const posts = [
      {
        title: "Easter Sunday recap",
        captions: {
          facebook: "What an incredible Easter Sunday! 🙏 Our sanctuary was packed with families, friends, and first-time visitors. Thank you to everyone who came out and made this day so special. The best is yet to come — see you next week!",
          instagram: "Easter Sunday was absolutely incredible. So grateful for this community. 🌿✨ #Easter #Community #Faith",
          twitter: "Easter Sunday was one for the books. Thank you to everyone who joined us! 🙏 #Easter",
        },
        platforms: ["facebook", "instagram", "twitter"],
        status: "PUBLISHED",
        publishedAt: daysAgo(10),
        scheduledAt: null,
      },
      {
        title: "Volunteer Appreciation Sunday",
        captions: {
          facebook: "This Sunday we're celebrating our incredible volunteers who give their time week after week to make church happen. From the parking team to the nursery to the worship team — we see you and we're so grateful. Come join us at 10am!",
          instagram: "Our volunteers are the heartbeat of this church. 💛 Join us Sunday at 10am as we celebrate the people who make it all possible. #Volunteers #Community",
        },
        platforms: ["facebook", "instagram"],
        status: "PUBLISHED",
        publishedAt: daysAgo(4),
        scheduledAt: null,
      },
      {
        title: "Summer small groups kick-off",
        captions: {
          facebook: "Summer Small Groups are starting June 1st! We have groups for young adults, families, couples, and seniors. Find your people this summer. Sign up at the link in our bio or at the welcome table this Sunday.",
          instagram: "Find your people this summer. 🌞 Summer Small Groups start June 1st — sign up at the link in bio! #SmallGroups #Community",
          twitter: "Summer Small Groups start June 1st! Find your group and sign up: [link] #SmallGroups",
        },
        platforms: ["facebook", "instagram", "twitter"],
        status: "SCHEDULED",
        scheduledAt: daysFromNow(3),
        publishedAt: null,
      },
      {
        title: "Prayer Night this Thursday",
        captions: {
          facebook: "Join us Thursday at 7pm for an evening of worship and prayer. No program, no agenda — just time together seeking God. All are welcome. Light refreshments provided.",
          instagram: "Thursday at 7pm — Prayer Night. Come as you are. 🕯️ #Prayer #Worship #Community",
        },
        platforms: ["facebook", "instagram"],
        status: "SCHEDULED",
        scheduledAt: daysFromNow(7),
        publishedAt: null,
      },
      {
        title: "Youth camp registration open",
        captions: {
          facebook: "Youth Camp 2026 registration is officially OPEN! 🏕️ July 14–18, ages 12–18. Early bird pricing ends June 1st. This is always a highlight of our summer — don't miss it!",
          instagram: "Youth Camp 2026 is officially open for registration! 🏕️ July 14–18 for ages 12–18. Early bird pricing ends June 1. #YouthCamp #Summer",
          twitter: "Youth Camp 2026 registration is open! 🏕️ July 14–18, ages 12–18. Early bird ends June 1! #YouthCamp",
        },
        platforms: ["facebook", "instagram", "twitter"],
        status: "SCHEDULED",
        scheduledAt: daysFromNow(14),
        publishedAt: null,
      },
      {
        title: "New series starting next month",
        captions: {
          facebook: "We're working on something big for next month — a brand new sermon series that we can't wait to share with you. Stay tuned for the announcement this Sunday!",
        },
        platforms: ["facebook"],
        status: "DRAFT",
        scheduledAt: null,
        publishedAt: null,
      },
      {
        title: "Welcome new members",
        captions: {
          facebook: "We're so excited to welcome our newest members to the Demo Community Church family! If you're looking for a church home, we'd love to meet you. Visit us any Sunday at 9am or 11am.",
          instagram: "So excited to welcome new members to our church family! 🎉 Come find your home. #NewMembers #Church",
        },
        platforms: ["facebook", "instagram"],
        status: "DRAFT",
        scheduledAt: null,
        publishedAt: null,
      },
    ];

    for (const p of posts) {
      await prisma.post.create({
        data: {
          organizationId: org.id,
          authorId: author.id,
          ...p,
        },
      });
    }
    console.log(`  Created ${posts.length} sample posts`);
  }

  // ── 6. Saved AI Suggestions ────────────────────────────────────────────────
  const existingSuggestions = await prisma.savedAiSuggestion.count({
    where: { organizationId: org.id },
  });
  if (existingSuggestions === 0) {
    const suggestions = [
      {
        topic: "Mother's Day",
        caption:
          "This Mother's Day, we honor the women who shape our faith, our families, and our community. Thank you for your love, sacrifice, and steadfast presence. Happy Mother's Day from all of us! 🌸",
        hashtags: ["#MothersDay", "#Church", "#Community", "#Family"],
        platforms: ["facebook", "instagram"],
      },
      {
        topic: "Community food drive",
        caption:
          "Our annual food drive kicks off this Sunday! Bring non-perishable items to the welcome table. Together, we can make sure no family in our community goes hungry this summer. 🥫❤️",
        hashtags: ["#FoodDrive", "#CommunityFirst", "#ServeYourNeighbor"],
        platforms: ["facebook", "instagram", "twitter"],
      },
    ];
    for (const s of suggestions) {
      await prisma.savedAiSuggestion.create({
        data: {
          organizationId: org.id,
          savedByClerkId: CLERK_ID,
          ...s,
        },
      });
    }
    console.log(`  Created ${suggestions.length} saved AI suggestions`);
  }

  console.log("\n✅ Demo org seeded successfully!");
  console.log(`   Org slug:    demo`);
  console.log(`   Org ID:      ${org.id}`);
  console.log(`   Demo URL:    https://demo.churchpost.social`);
  console.log(`\n   Next step: create a Clerk account (demo@churchpost.social) and`);
  console.log(`   run this script again with the Clerk user ID:`);
  console.log(`   node src/scripts/seedDemo.js user_xxxx`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

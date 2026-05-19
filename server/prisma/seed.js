import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.organization.findUnique({
    where: { slug: "city-church-lufkin" },
  });

  if (existing) {
    console.log("Organization already seeded — skipping.");
    return;
  }

  const org = await prisma.organization.create({
    data: {
      name: "City Church Lufkin",
      slug: "city-church-lufkin",
      customDomain: "social.citychurchlufkin.com",
      plan: "FREE",
      settings: {
        create: {
          aiSystemPrompt:
            "You are a social media assistant for a Christian church. Write warm, welcoming, and inclusive content. Avoid religious jargon. Posts should feel community-focused, genuine, and encouraging. Never use clickbait language.",
          timezone: "America/Chicago",
          brandPrimaryColor: "#6366f1",
          brandSecondaryColor: "#8b5cf6",
          brandTextOnPrimary: "#ffffff",
          brandFontFamily: "Inter",
          nationalCalendarHolidays: true,
          nationalCalendarAwareness: true,
          nationalCalendarLiturgical: true,
          nationalCalendarFun: true,
          proactiveSuggestions: true,
        },
      },
    },
  });

  console.log(`✓ Organization: ${org.name} (${org.slug})`);
  console.log("  → First user to sign in will be auto-promoted to Org Admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

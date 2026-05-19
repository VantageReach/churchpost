import axios from "axios";
import Bottleneck from "bottleneck";
import prisma from "../lib/prisma.js";
import { encrypt, decrypt } from "../lib/encryption.js";

const PC_BASE = "https://api.planningcenteronline.com";
const TOKEN_URL = "https://api.planningcenteronline.com/oauth/token";

// Rate limiter: 100 req / 20 sec = 5 req/sec
const limiter = new Bottleneck({ minTime: 200, maxConcurrent: 2 });

// ── Token management ───────────────────────────────────────────────────────

async function getValidToken(conn) {
  if (conn.tokenExpiresAt && conn.tokenExpiresAt > new Date(Date.now() + 60_000)) {
    return decrypt(conn.accessToken);
  }
  // Refresh
  const refreshToken = decrypt(conn.refreshToken);
  const res = await axios.post(TOKEN_URL, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.PLANNING_CENTER_CLIENT_ID,
    client_secret: process.env.PLANNING_CENTER_CLIENT_SECRET,
  });
  const { access_token, refresh_token, expires_in } = res.data;
  await prisma.planningCenterConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: encrypt(access_token),
      refreshToken: encrypt(refresh_token || refreshToken),
      tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
    },
  });
  return access_token;
}

// ── Paginated fetch ────────────────────────────────────────────────────────

async function fetchAll(token, path) {
  const results = [];
  let url = `${PC_BASE}${path}`;
  while (url) {
    const res = await limiter.schedule(() =>
      axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: url === `${PC_BASE}${path}` ? { per_page: 100 } : undefined,
      }).catch((err) => {
        console.error(`[PC Sync] fetchAll failed — URL: ${url} — status: ${err?.response?.status} — detail: ${JSON.stringify(err?.response?.data?.errors?.[0])}`);
        throw err;
      })
    );
    results.push(...(res.data.data ?? []));
    url = res.data.links?.next ?? null;
  }
  return results;
}

// ── Source sync functions ──────────────────────────────────────────────────

async function syncCalendar(orgId, token, lookahead) {
  const since = new Date().toISOString();
  const until = new Date(Date.now() + lookahead * 86400_000).toISOString();
  const events = await fetchAll(
    token,
    `/calendar/v2/events?filter=future&where[starts_at][gte]=${since}&where[starts_at][lte]=${until}`
  );

  for (const ev of events) {
    const a = ev.attributes;
    await prisma.planningCenterEvent.upsert({
      where: { organizationId_pcEventId_source: { organizationId: orgId, pcEventId: ev.id, source: "calendar" } },
      update: { title: a.name ?? "Event", description: a.description, startsAt: a.starts_at ? new Date(a.starts_at) : null, endsAt: a.ends_at ? new Date(a.ends_at) : null, location: a.location, fetchedAt: new Date() },
      create: { organizationId: orgId, pcEventId: ev.id, source: "calendar", title: a.name ?? "Event", description: a.description, startsAt: a.starts_at ? new Date(a.starts_at) : null, endsAt: a.ends_at ? new Date(a.ends_at) : null, location: a.location },
    });
  }
  return events.length;
}

async function syncServices(orgId, token, lookahead) {
  const serviceTypes = await fetchAll(token, "/services/v2/service_types");
  let count = 0;

  const until = new Date(Date.now() + lookahead * 86400_000).toISOString();

  for (const st of serviceTypes) {
    const plans = await fetchAll(token, `/services/v2/service_types/${st.id}/plans?filter=future&where[sort_date][lte]=${until}`);
    for (const plan of plans) {
      const a = plan.attributes;
      const startsAt = a.sort_date ? new Date(a.sort_date) : null;
      await prisma.planningCenterEvent.upsert({
        where: { organizationId_pcEventId_source: { organizationId: orgId, pcEventId: plan.id, source: "services" } },
        update: { title: a.title || st.attributes?.name || "Service", description: a.public_description, startsAt, metadata: { seriesTitle: a.series_title, serviceTypeName: st.attributes?.name }, fetchedAt: new Date() },
        create: { organizationId: orgId, pcEventId: plan.id, source: "services", title: a.title || st.attributes?.name || "Service", description: a.public_description, startsAt, metadata: { seriesTitle: a.series_title, serviceTypeName: st.attributes?.name } },
      });
      count++;
    }
  }
  return count;
}

async function syncGroups(orgId, token) {
  const groups = await fetchAll(token, "/groups/v2/groups?where[enrollment_strategy]=open_signup");
  for (const g of groups) {
    const a = g.attributes;
    await prisma.planningCenterEvent.upsert({
      where: { organizationId_pcEventId_source: { organizationId: orgId, pcEventId: g.id, source: "groups" } },
      update: { title: a.name, description: a.description, location: a.location, metadata: { enrollmentStrategy: a.enrollment_strategy, membershipCount: a.memberships_count, schedule: a.schedule }, fetchedAt: new Date() },
      create: { organizationId: orgId, pcEventId: g.id, source: "groups", title: a.name, description: a.description, location: a.location, metadata: { enrollmentStrategy: a.enrollment_strategy, membershipCount: a.memberships_count, schedule: a.schedule } },
    });
  }
  return groups.length;
}

async function syncRegistrations(orgId, token, lookahead) {
  const until = new Date(Date.now() + lookahead * 86400_000).toISOString();
  const events = await fetchAll(token, `/registrations/v2/events?where[starts_at][lte]=${until}`);

  for (const ev of events) {
    const a = ev.attributes;
    const startsAt = a.starts_at ? new Date(a.starts_at) : null;
    if (!startsAt || startsAt < new Date()) continue;

    await prisma.planningCenterEvent.upsert({
      where: { organizationId_pcEventId_source: { organizationId: orgId, pcEventId: ev.id, source: "registrations" } },
      update: { title: a.name, startsAt, registrationUrl: a.registration_url, spotsAvailable: a.remaining_capacity, metadata: { totalCapacity: a.total_capacity, registrationOpenAt: a.registration_open_at }, fetchedAt: new Date() },
      create: { organizationId: orgId, pcEventId: ev.id, source: "registrations", title: a.name, startsAt, registrationUrl: a.registration_url, spotsAvailable: a.remaining_capacity, metadata: { totalCapacity: a.total_capacity, registrationOpenAt: a.registration_open_at } },
    });
  }
  return events.length;
}

// ── Main sync entry point ──────────────────────────────────────────────────

export async function syncPlanningCenter(organizationId) {
  const conn = await prisma.planningCenterConnection.findUnique({
    where: { organizationId },
  });
  if (!conn) throw new Error("No Planning Center connection for org");

  await prisma.planningCenterConnection.update({
    where: { id: conn.id },
    data: { syncStatus: "syncing", errorMessage: null },
  });

  try {
    const token = await getValidToken(conn);
    const counts = { calendar: 0, services: 0, groups: 0, registrations: 0 };
    const sourceErrors = [];

    async function trySync(name, enabled, fn) {
      if (!enabled) return;
      try {
        counts[name] = await fn();
      } catch (err) {
        const msg = err?.response?.data?.errors?.[0]?.detail ?? err.message;
        const status = err?.response?.status;
        if (status === 404 || status === 403) {
          // Module not available for this church — skip silently
          console.warn(`[PC Sync] Org ${organizationId}: ${name} unavailable (${status}) — skipping`);
        } else {
          console.error(`[PC Sync] Org ${organizationId}: ${name} failed:`, msg);
          sourceErrors.push(`${name}: ${msg}`);
        }
      }
    }

    await trySync("calendar",      conn.syncCalendar,      () => syncCalendar(organizationId, token, conn.lookAheadDays));
    await trySync("services",      conn.syncServices,      () => syncServices(organizationId, token, conn.lookAheadDays));
    await trySync("groups",        conn.syncGroups,        () => syncGroups(organizationId, token));
    await trySync("registrations", conn.syncRegistrations, () => syncRegistrations(organizationId, token, conn.lookAheadDays));

    const hasAnySuccess = Object.values(counts).some((n) => n > 0) || sourceErrors.length === 0;
    const syncStatus = sourceErrors.length > 0 ? "partial" : "success";
    const errorMessage = sourceErrors.length > 0 ? sourceErrors.join("; ") : null;

    await prisma.planningCenterConnection.update({
      where: { id: conn.id },
      data: { syncStatus, lastSyncedAt: new Date(), errorMessage },
    });

    console.log(`[PC Sync] Org ${organizationId}: calendar=${counts.calendar} services=${counts.services} groups=${counts.groups} registrations=${counts.registrations}`);
    return counts;
  } catch (err) {
    const msg = err?.response?.data?.errors?.[0]?.detail ?? err.message;
    await prisma.planningCenterConnection.update({
      where: { id: conn.id },
      data: { syncStatus: "error", errorMessage: msg },
    });
    throw err;
  }
}

export { encrypt, decrypt };

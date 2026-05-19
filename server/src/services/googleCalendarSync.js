import axios from "axios";
import prisma from "../lib/prisma.js";
import { decrypt, encrypt } from "../lib/encryption.js";

async function getValidToken(connection) {
  // If token expires in >60s, use it directly
  if (
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt > new Date(Date.now() + 60_000)
  ) {
    return decrypt(connection.accessToken);
  }
  // Refresh the token
  const res = await axios.post("https://oauth2.googleapis.com/token", {
    refresh_token: decrypt(connection.refreshToken),
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  const { access_token, expires_in } = res.data;
  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encrypt(access_token),
      tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
    },
  });
  return access_token;
}

export async function syncGoogleCalendar(organizationId) {
  const connection = await prisma.googleCalendarConnection.findFirst({
    where: { organizationId, purpose: "events" },
  });
  if (!connection) return;

  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: { syncStatus: "syncing", errorMessage: null },
  });

  try {
    const token = await getValidToken(connection);
    const lookahead = connection.lookAheadDays || 60;
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + lookahead * 86400_000).toISOString();

    const res = await axios.get(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId)}/events`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 100,
        },
      }
    );

    const items = res.data.items ?? [];

    // Upsert each event
    for (const item of items) {
      if (!item.summary) continue; // skip events with no title
      const isAllDay = !!item.start?.date && !item.start?.dateTime;
      const startsAt = item.start?.dateTime
        ? new Date(item.start.dateTime)
        : item.start?.date
        ? new Date(item.start.date)
        : null;
      const endsAt = item.end?.dateTime
        ? new Date(item.end.dateTime)
        : item.end?.date
        ? new Date(item.end.date)
        : null;

      await prisma.googleCalendarEvent.upsert({
        where: {
          connectionId_googleEventId: {
            connectionId: connection.id,
            googleEventId: item.id,
          },
        },
        update: {
          title: item.summary,
          description: item.description || null,
          startsAt,
          endsAt,
          location: item.location || null,
          isAllDay,
          fetchedAt: new Date(),
        },
        create: {
          organizationId,
          connectionId: connection.id,
          googleEventId: item.id,
          title: item.summary,
          description: item.description || null,
          startsAt,
          endsAt,
          location: item.location || null,
          isAllDay,
        },
      });
    }

    // Delete events that are no longer in the fetched range
    const fetchedIds = items.map((i) => i.id);
    await prisma.googleCalendarEvent.deleteMany({
      where: {
        connectionId: connection.id,
        googleEventId: { notIn: fetchedIds },
        startsAt: { gte: new Date(timeMin), lte: new Date(timeMax) },
      },
    });

    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "success",
        lastSyncedAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (err) {
    console.error("[GCal sync]", err?.response?.data || err.message);
    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "error",
        errorMessage:
          err?.response?.data?.error?.message || err.message,
      },
    });
  }
}

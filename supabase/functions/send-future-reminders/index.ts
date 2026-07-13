import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import webPush from "npm:web-push@3.6.7";

type CalendarEvent = {
  id: string;
  title?: string;
  status?: string;
  date?: string;
  start: number;
  lifeLogId?: string;
  notificationMinutes?: number | null;
  notificationSentAt?: string;
};

type SharedState = {
  events?: CalendarEvent[];
  [key: string]: unknown;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type SupabaseClient = ReturnType<typeof createClient>;

const STATE_TABLE = "project_life_state";
const STATE_ID = "default";
const MINUTES_TO_MS = 60 * 1000;
const JAPAN_UTC_OFFSET_MINUTES = 9 * 60;
const MAX_STATE_UPDATE_ATTEMPTS = 3;

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getEventStartDateTime(event: CalendarEvent) {
  if (!event.date || !Number.isFinite(event.start)) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(event.date);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const localMidnightUtc = Date.UTC(year, month - 1, day);
  const validationDate = new Date(localMidnightUtc);
  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    return null;
  }

  return new Date(
    localMidnightUtc +
      (event.start - JAPAN_UTC_OFFSET_MINUTES) * MINUTES_TO_MS,
  );
}

function getReminderNotificationTime(event: CalendarEvent) {
  if (
    event.notificationMinutes === null ||
    event.notificationMinutes === undefined ||
    !Number.isFinite(event.notificationMinutes)
  ) {
    return null;
  }

  const startAt = getEventStartDateTime(event);
  if (!startAt) return null;
  return new Date(
    startAt.getTime() - event.notificationMinutes * MINUTES_TO_MS,
  );
}

function hasAlreadySent(event: CalendarEvent, notifyAt: Date) {
  if (!event.notificationSentAt) return false;
  const sentAt = Date.parse(event.notificationSentAt);
  return !Number.isNaN(sentAt) && sentAt >= notifyAt.getTime();
}

function getDueEvents(events: CalendarEvent[], now: Date) {
  return events.flatMap((event) => {
    if (
      !event.lifeLogId ||
      event.notificationMinutes === null ||
      event.notificationMinutes === undefined ||
      event.status !== "pending"
    ) {
      return [];
    }

    const eventStartAt = getEventStartDateTime(event);
    const notifyAt = getReminderNotificationTime(event);
    if (!eventStartAt || !notifyAt) return [];
    if (notifyAt > now) return [];
    if (hasAlreadySent(event, notifyAt)) return [];
    return [{ event, eventStartAt, notifyAt }];
  });
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

function createNotificationUrl(appUrl: string, eventId: string) {
  const separator = appUrl.includes("?") ? "&" : "?";
  return `${appUrl}${separator}page=today&eventId=${encodeURIComponent(eventId)}`;
}

async function saveSentState(
  supabase: SupabaseClient,
  sentNotifications: Map<string, string>,
  sentAt: string,
) {
  for (let attempt = 0; attempt < MAX_STATE_UPDATE_ATTEMPTS; attempt += 1) {
    const { data: currentRow, error: readError } = await supabase
      .from(STATE_TABLE)
      .select("state,updated_at")
      .eq("id", STATE_ID)
      .maybeSingle();
    if (readError) throw readError;
    if (!currentRow) throw new Error("Project LIFE state was not found");

    const currentState = currentRow.state as SharedState;
    const currentEvents = Array.isArray(currentState.events)
      ? currentState.events
      : [];
    const nextEvents = currentEvents.map((event) => {
      const expectedNotifyAt = sentNotifications.get(event.id);
      if (!expectedNotifyAt) return event;

      const currentNotifyAt = getReminderNotificationTime(event);
      if (currentNotifyAt?.toISOString() !== expectedNotifyAt) return event;
      if (hasAlreadySent(event, currentNotifyAt)) return event;
      return { ...event, notificationSentAt: sentAt };
    });
    const nextState = { ...currentState, events: nextEvents };

    const { data: updatedRows, error: updateError } = await supabase
      .from(STATE_TABLE)
      .update({ state: nextState, updated_at: sentAt })
      .eq("id", STATE_ID)
      .eq("updated_at", currentRow.updated_at)
      .select("id");
    if (updateError) throw updateError;
    if (updatedRows && updatedRows.length > 0) return;
  }

  throw new Error("Project LIFE state changed while saving notification status");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: { Allow: "POST" } },
    );
  }

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = requireEnv("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = requireEnv("VAPID_PRIVATE_KEY");
    const vapidSubject =
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:project-life@example.com";
    const appUrl = Deno.env.get("PROJECT_LIFE_APP_URL") ?? "/";

    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: stateRow, error: stateError } = await supabase
      .from(STATE_TABLE)
      .select("state")
      .eq("id", STATE_ID)
      .maybeSingle();
    if (stateError) throw stateError;

    const state = stateRow?.state as SharedState | undefined;
    const events = Array.isArray(state?.events) ? state.events : [];
    const dueEvents = getDueEvents(events, new Date());
    if (dueEvents.length === 0) {
      return Response.json({ due: 0, sent: 0, failed: 0 });
    }

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth");
    if (subscriptionError) throw subscriptionError;

    const pushSubscriptions = (subscriptions ?? []) as PushSubscriptionRow[];
    const sentNotifications = new Map<string, string>();
    let sent = 0;
    let failed = 0;

    for (const reminder of dueEvents) {
      const payload = JSON.stringify({
        title: "Project LIFE",
        body: `${reminder.event.title ?? "予定"} ${formatTime(reminder.eventStartAt)}〜`,
        url: createNotificationUrl(appUrl, reminder.event.id),
        eventId: reminder.event.id,
      });
      const results = await Promise.allSettled(
        pushSubscriptions.map((subscription) =>
          webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
          ),
        ),
      );
      const successfulDeliveries = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      sent += successfulDeliveries;
      failed += results.length - successfulDeliveries;

      if (successfulDeliveries > 0) {
        sentNotifications.set(
          reminder.event.id,
          reminder.notifyAt.toISOString(),
        );
      }
    }

    if (sentNotifications.size > 0) {
      await saveSentState(
        supabase,
        sentNotifications,
        new Date().toISOString(),
      );
    }

    return Response.json({
      due: dueEvents.length,
      sent,
      failed,
      markedAsSent: sentNotifications.size,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

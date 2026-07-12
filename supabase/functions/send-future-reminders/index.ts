import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import webPush from "npm:web-push@3.6.7";

type CalendarEvent = {
  id: string;
  title?: string;
  categoryId: string;
  status?: string;
  date?: string;
  start: number;
  lifeLogId?: string;
  notificationMinutes?: number | null;
  notificationSentAt?: string;
  linkedToEventId?: string;
  linkType?: string;
  routineRelation?: string;
  source?: string;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const STATE_TABLE = "project_life_state";
const STATE_ID = "default";
const MINUTES_TO_MS = 60 * 1000;
const EXCLUDED_CATEGORY_IDS = new Set([
  "work",
  "sleep",
  "wake",
  "walk",
  "takken-law",
  "rights",
  "regulations",
  "meal",
  "meal-prep",
  "bath",
  "cleaning",
  "commute",
]);

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getEventStartDateTime(event: CalendarEvent) {
  if (!event.date) return null;
  const startAt = new Date(`${event.date}T00:00:00`);
  if (Number.isNaN(startAt.getTime())) return null;
  startAt.setMinutes(startAt.getMinutes() + event.start);
  return startAt;
}

function getReminderNotificationTime(event: CalendarEvent) {
  if (event.notificationMinutes === null || event.notificationMinutes === undefined) {
    return null;
  }
  const startAt = getEventStartDateTime(event);
  if (!startAt) return null;
  return new Date(startAt.getTime() - event.notificationMinutes * MINUTES_TO_MS);
}

function hasAlreadySent(event: CalendarEvent, notifyAt: Date) {
  if (!event.notificationSentAt) return false;
  const sentAt = Date.parse(event.notificationSentAt);
  return !Number.isNaN(sentAt) && sentAt >= notifyAt.getTime();
}

function isEligibleEvent(event: CalendarEvent) {
  return (
    !EXCLUDED_CATEGORY_IDS.has(event.categoryId) &&
    event.source !== "fixed-template" &&
    !event.routineRelation &&
    !event.linkedToEventId &&
    event.linkType === "none"
  );
}

function getDueEvents(events: CalendarEvent[], now: Date) {
  return events.flatMap((event) => {
    if (
      !event.lifeLogId ||
      event.notificationMinutes === null ||
      event.notificationMinutes === undefined ||
      event.status !== "pending" ||
      !isEligibleEvent(event)
    ) {
      return [];
    }

    const eventStartAt = getEventStartDateTime(event);
    const notifyAt = getReminderNotificationTime(event);
    if (!eventStartAt || !notifyAt) return [];
    if (eventStartAt <= now) return [];
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

Deno.serve(async () => {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = requireEnv("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = requireEnv("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:project-life@example.com";
  const appUrl = Deno.env.get("PROJECT_LIFE_APP_URL") ?? "/";

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: stateRow, error: stateError } = await supabase
    .from(STATE_TABLE)
    .select("state")
    .eq("id", STATE_ID)
    .maybeSingle();
  if (stateError) throw stateError;

  const state = stateRow?.state as { events?: CalendarEvent[] } | undefined;
  const events = Array.isArray(state?.events) ? state.events : [];
  const dueEvents = getDueEvents(events, new Date());
  if (dueEvents.length === 0) {
    return Response.json({ sent: 0 });
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth");
  if (subscriptionError) throw subscriptionError;

  const pushSubscriptions = (subscriptions ?? []) as PushSubscriptionRow[];
  let sent = 0;

  for (const reminder of dueEvents) {
    const payload = JSON.stringify({
      title: "Project LIFE",
      body: `${reminder.event.title ?? "予定"} ${formatTime(reminder.eventStartAt)}〜`,
      url: `${appUrl}?page=today&eventId=${encodeURIComponent(reminder.event.id)}`,
      eventId: reminder.event.id,
    });

    await Promise.allSettled(
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
    sent += pushSubscriptions.length;
  }

  const sentAt = new Date().toISOString();
  const sentEventIds = new Set(dueEvents.map(({ event }) => event.id));
  const nextState = {
    ...stateRow?.state,
    events: events.map((event) =>
      sentEventIds.has(event.id)
        ? { ...event, notificationSentAt: sentAt }
        : event,
    ),
  };

  const { error: updateError } = await supabase
    .from(STATE_TABLE)
    .update({ state: nextState, updated_at: sentAt })
    .eq("id", STATE_ID);
  if (updateError) throw updateError;

  return Response.json({ sent, events: dueEvents.length });
});

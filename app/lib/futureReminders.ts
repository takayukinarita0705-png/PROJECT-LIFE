import type { CalendarEvent } from "@/app/types/calendar";

export type FutureReminderNotification = {
  event: CalendarEvent;
  eventStartAt: Date;
  notifyAt: Date;
  dedupeKey: string;
};

const MINUTES_TO_MS = 60 * 1000;
export const FUTURE_REMINDER_EXCLUDED_CATEGORY_IDS = new Set([
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

function isFutureReminderEligibleEvent(event: CalendarEvent) {
  return (
    !FUTURE_REMINDER_EXCLUDED_CATEGORY_IDS.has(event.categoryId) &&
    event.source !== "fixed-template" &&
    !event.routineRelation &&
    !event.linkedToEventId &&
    event.linkType === "none"
  );
}

export function getEventStartDateTime(event: CalendarEvent) {
  if (!event.date) return null;

  const startAt = new Date(`${event.date}T00:00:00`);
  if (Number.isNaN(startAt.getTime())) return null;
  startAt.setMinutes(startAt.getMinutes() + event.start);
  return startAt;
}

export function getReminderNotificationTime(event: CalendarEvent) {
  if (event.notificationMinutes === null) return null;

  const startAt = getEventStartDateTime(event);
  if (!startAt) return null;

  return new Date(
    startAt.getTime() - event.notificationMinutes * MINUTES_TO_MS,
  );
}

function hasAlreadySentNotification(
  event: CalendarEvent,
  notifyAt: Date,
) {
  if (!event.notificationSentAt) return false;
  const sentAt = Date.parse(event.notificationSentAt);
  return !Number.isNaN(sentAt) && sentAt >= notifyAt.getTime();
}

export function getFutureReminderCandidate(
  event: CalendarEvent,
  referenceDate = new Date(),
): FutureReminderNotification | null {
  if (
    !event.lifeLogId ||
    event.notificationMinutes === null ||
    event.status !== "pending" ||
    !isFutureReminderEligibleEvent(event)
  ) {
    return null;
  }

  const eventStartAt = getEventStartDateTime(event);
  const notifyAt = getReminderNotificationTime(event);
  if (!eventStartAt || !notifyAt) return null;
  if (eventStartAt <= referenceDate) return null;
  if (notifyAt < referenceDate) return null;
  if (hasAlreadySentNotification(event, notifyAt)) return null;

  return {
    event,
    eventStartAt,
    notifyAt,
    dedupeKey: `${event.id}:${notifyAt.toISOString()}`,
  };
}

export function getFutureReminderCandidates(
  events: CalendarEvent[],
  referenceDate = new Date(),
) {
  return events.flatMap((event) => {
    const candidate = getFutureReminderCandidate(event, referenceDate);
    return candidate ? [candidate] : [];
  });
}

export function getDueFutureReminderNotifications(
  events: CalendarEvent[],
  referenceDate = new Date(),
) {
  return events.flatMap((event) => {
    if (
      !event.lifeLogId ||
      event.notificationMinutes === null ||
      event.status !== "pending" ||
      !isFutureReminderEligibleEvent(event)
    ) {
      return [];
    }

    const eventStartAt = getEventStartDateTime(event);
    const notifyAt = getReminderNotificationTime(event);
    if (!eventStartAt || !notifyAt) return [];
    if (eventStartAt <= referenceDate) return [];
    if (notifyAt > referenceDate) return [];
    if (hasAlreadySentNotification(event, notifyAt)) return [];

    return [
      {
        event,
        eventStartAt,
        notifyAt,
        dedupeKey: `${event.id}:${notifyAt.toISOString()}`,
      },
    ];
  });
}

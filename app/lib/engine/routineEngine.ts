import type { CalendarEvent } from "@/app/types/calendar";

const MINUTES_PER_DAY = 24 * 60;

function getEventDuration(event: CalendarEvent) {
  const duration = event.end - event.start;
  return duration >= 0 ? duration : MINUTES_PER_DAY + duration;
}

function recalculateLinkedEvent(
  event: CalendarEvent,
  parent: CalendarEvent,
) {
  const duration = getEventDuration(event);
  if (event.linkType === "after") {
    const start = parent.end + event.offsetMinutes;
    return {
      ...event,
      date: parent.date,
      day: parent.day,
      weekOffset: parent.weekOffset,
      start,
      end: start + duration,
    };
  }
  if (event.linkType === "before") {
    const end = parent.start - event.offsetMinutes;
    return {
      ...event,
      date: parent.date,
      day: parent.day,
      weekOffset: parent.weekOffset,
      start: end - duration,
      end,
    };
  }
  return event;
}

export function runRoutineEngine(
  events: CalendarEvent[],
  changedEvent: CalendarEvent,
): CalendarEvent[] {
  const updatedEvents = events.map((event) =>
    event.id === changedEvent.id ? changedEvent : event,
  );
  const eventsById = new Map(
    updatedEvents.map((event) => [event.id, event]),
  );
  if (!eventsById.has(changedEvent.id)) return updatedEvents;

  const pendingParentIds = [changedEvent.id];
  const processedIds = new Set<string>();

  while (pendingParentIds.length > 0) {
    const parentId = pendingParentIds.shift();
    if (!parentId || processedIds.has(parentId)) continue;
    processedIds.add(parentId);

    const parent = eventsById.get(parentId);
    if (!parent) continue;

    updatedEvents
      .filter(
        (event) =>
          event.linkedToEventId === parentId &&
          event.linkType !== "none",
      )
      .forEach((event) => {
        if (processedIds.has(event.id)) return;

        eventsById.set(
          event.id,
          recalculateLinkedEvent(
            eventsById.get(event.id) ?? event,
            parent,
          ),
        );
        pendingParentIds.push(event.id);
      });
  }

  return updatedEvents.map((event) => eventsById.get(event.id) ?? event);
}

import type { CalendarEvent } from "@/app/types/calendar";
import {
  materializeEventDate,
  resolveEventDate,
} from "@/app/lib/date";

export const WORKDAY_ROUTINE = {
  workCategoryId: "work",
  mealCategoryId: "meal",
  bathCategoryId: "bath",
  mealDelayMinutes: 30,
} as const;

function hasScheduleChanged(
  originalEvent: CalendarEvent,
  movedEvent: CalendarEvent,
) {
  return (
    resolveEventDate(originalEvent) !== resolveEventDate(movedEvent) ||
    originalEvent.start !== movedEvent.start ||
    originalEvent.end !== movedEvent.end
  );
}

export function runRoutineEngine(
  events: CalendarEvent[],
  originalEvent: CalendarEvent,
  movedEvent: CalendarEvent,
): CalendarEvent[] {
  const updatedEvents = events.map((event) =>
    event.id === originalEvent.id ? movedEvent : event,
  );
  if (
    originalEvent.categoryId !== WORKDAY_ROUTINE.workCategoryId ||
    movedEvent.categoryId !== WORKDAY_ROUTINE.workCategoryId ||
    originalEvent.mode !== "fixed" ||
    movedEvent.mode !== "fixed" ||
    originalEvent.routineDetached ||
    !hasScheduleChanged(originalEvent, movedEvent)
  ) {
    return updatedEvents;
  }

  const eventsById = new Map(
    updatedEvents.map((event) => [event.id, event]),
  );
  const pendingParentIds = [movedEvent.id];
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
          event.mode === "linked" &&
          event.linkType === "after" &&
          event.linkedToEventId === parentId,
      )
      .forEach((event) => {
        if (processedIds.has(event.id)) return;

        const duration = event.end - event.start;
        const start = parent.end + event.offsetMinutes;
        eventsById.set(
          event.id,
          materializeEventDate({
            ...event,
            date: resolveEventDate(parent),
            day: parent.day,
            weekOffset: parent.weekOffset,
            start,
            end: start + duration,
          }),
        );
        pendingParentIds.push(event.id);
      });
  }

  return updatedEvents.map((event) => eventsById.get(event.id) ?? event);
}

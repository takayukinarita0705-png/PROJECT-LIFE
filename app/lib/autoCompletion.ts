import { FREE_CATEGORY_ID } from "@/app/lib/calendar";
import {
  parseCalendarDate,
  resolveEventDate,
} from "@/app/lib/date";
import type { CalendarEvent, Category } from "@/app/types/calendar";

const MINUTES_PER_DAY = 24 * 60;

export const AUTOMATIC_COMPLETION_CATEGORY_NAMES = new Set([
  "仕事",
  "朝ご飯",
  "昼ご飯",
  "夜ご飯",
  "その他食事",
  "お風呂",
  // Project LIFEの既存標準カテゴリ。朝・昼・夜の食事予定に共通利用される。
  "ご飯",
]);

export function isAutomaticCompletionEvent(
  event: CalendarEvent,
  category: Category,
) {
  return (
    event.lifeLogId === undefined &&
    event.categoryId !== FREE_CATEGORY_ID &&
    AUTOMATIC_COMPLETION_CATEGORY_NAMES.has(category.name.trim())
  );
}

export function getEventAutomaticCompletionTime(
  event: CalendarEvent,
  referenceDate = new Date(),
) {
  const eventDate = resolveEventDate(event, referenceDate);
  const explicitEndDate =
    event.endDate !== undefined && event.endDate > eventDate
      ? parseCalendarDate(event.endDate)
      : null;
  const completionDate = explicitEndDate ?? parseCalendarDate(eventDate);
  if (completionDate === null) return null;

  completionDate.setHours(0, 0, 0, 0);
  const endMinutes = explicitEndDate
    ? event.end % MINUTES_PER_DAY
    : event.end <= event.start
      ? event.end + MINUTES_PER_DAY
      : event.end;
  completionDate.setMinutes(endMinutes);
  return completionDate;
}

export function completeEndedAutomaticEvents(
  events: CalendarEvent[],
  categories: Category[],
  now: Date,
) {
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  let hasChanged = false;
  const completedEvents = events.map((event) => {
    if (event.status !== "pending" && event.status !== "active") {
      return event;
    }
    const category = categoriesById.get(event.categoryId);
    if (!category || !isAutomaticCompletionEvent(event, category)) {
      return event;
    }
    const completionTime = getEventAutomaticCompletionTime(event, now);
    if (completionTime === null || now < completionTime) return event;

    hasChanged = true;
    return {
      ...event,
      status: "completed" as const,
      completedAt: completionTime.toISOString(),
    };
  });

  return hasChanged ? completedEvents : events;
}

import type { CalendarEvent } from "@/app/types/calendar";

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatCalendarDate(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseCalendarDate(value: string) {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  return formatCalendarDate(date) === value ? date : null;
}

export function isCalendarDate(value: unknown): value is string {
  return typeof value === "string" && parseCalendarDate(value) !== null;
}

export function getDateFromWeekOffset(
  anchorWeekStart: Date | string,
  weekOffset: number,
  day: number,
): string {
  const anchorDate =
    anchorWeekStart instanceof Date
      ? new Date(anchorWeekStart.getTime())
      : parseCalendarDate(anchorWeekStart);
  if (!anchorDate || Number.isNaN(anchorDate.getTime())) {
    throw new RangeError("anchorWeekStart must be a valid calendar date.");
  }

  anchorDate.setDate(anchorDate.getDate() + weekOffset * 7 + day);
  return formatCalendarDate(anchorDate);
}

export function getCalendarDateForWeekDay(
  weekOffset: number,
  day: number,
  referenceDate = new Date(),
) {
  const monday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
  );
  const currentDay = monday.getDay();
  monday.setDate(
    monday.getDate() +
      (currentDay === 0 ? -6 : 1 - currentDay) +
      weekOffset * 7 +
      day,
  );
  return formatCalendarDate(monday);
}

export function resolveEventDate(
  event: Pick<CalendarEvent, "date" | "weekOffset" | "day">,
  referenceDate = new Date(),
) {
  return isCalendarDate(event.date)
    ? event.date
    : getCalendarDateForWeekDay(
        event.weekOffset,
        event.day,
        referenceDate,
      );
}

export function materializeEventDate<T extends CalendarEvent>(
  event: T,
  referenceDate = new Date(),
): T & { date: string } {
  const date = resolveEventDate(event, referenceDate);
  return event.date === date
    ? (event as T & { date: string })
    : { ...event, date };
}

export function resolveEventDay(
  event: Pick<CalendarEvent, "date" | "weekOffset" | "day">,
  referenceDate = new Date(),
) {
  const date = parseCalendarDate(resolveEventDate(event, referenceDate));
  return date === null ? event.day : (date.getDay() + 6) % 7;
}

export function isEventOnDate(
  event: Pick<CalendarEvent, "date" | "weekOffset" | "day">,
  date: string,
  referenceDate = new Date(),
) {
  return resolveEventDate(event, referenceDate) === date;
}

export function compareEventDates(
  a: Pick<CalendarEvent, "date" | "weekOffset" | "day">,
  b: Pick<CalendarEvent, "date" | "weekOffset" | "day">,
  referenceDate = new Date(),
) {
  return resolveEventDate(a, referenceDate).localeCompare(
    resolveEventDate(b, referenceDate),
  );
}

export function addDaysToCalendarDate(value: string, days: number) {
  const date = parseCalendarDate(value);
  if (!date) return value;

  date.setDate(date.getDate() + days);
  return formatCalendarDate(date);
}

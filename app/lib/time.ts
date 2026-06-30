import type { CalendarEvent } from "@/app/types/calendar";

export const MINUTES_PER_ROW = 30;
export const ROWS_PER_DAY = (24 * 60) / MINUTES_PER_ROW;
export const DISPLAY_START_MINUTES = 5 * 60;
export const DISPLAY_START_ROW = DISPLAY_START_MINUTES / MINUTES_PER_ROW;
export const ROW_HEIGHT = 32;
export const DISPLAY_ROWS = Array.from(
  { length: ROWS_PER_DAY },
  (_, displayRow) => displayRowToTimeRow(displayRow),
);

export function formatTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

export function parseTime(value: string) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 24 || (hour === 24 && minute !== 0)) return null;
  return hour * 60 + minute;
}

export function toMinutes(hour: number, minute = 0) {
  return hour * 60 + minute;
}

export function displayRowToTimeRow(displayRow: number) {
  return (displayRow + DISPLAY_START_ROW) % ROWS_PER_DAY;
}

export function minutesFromDisplayStart(minutes: number) {
  return (minutes - DISPLAY_START_MINUTES + 24 * 60) % (24 * 60);
}

export function getEventPosition(event: CalendarEvent, rowStart: number) {
  return {
    top: `${((event.start - rowStart) / MINUTES_PER_ROW) * 100}%`,
    height: `${((event.end - event.start) / MINUTES_PER_ROW) * 100}%`,
  };
}

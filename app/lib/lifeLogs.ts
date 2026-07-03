import type { LifeLog } from "@/app/types/calendar";
import {
  addDaysToCalendarDate,
  formatCalendarDate,
  getCalendarDateForWeekDay,
} from "@/app/lib/date";

export function normalizeLifeLogBody(body: string) {
  const normalized = body.trim();
  return normalized || null;
}

export function sortLifeLogsNewestFirst(logs: LifeLog[]) {
  return [...logs].sort(
    (first, second) =>
      Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );
}

export function getLifeLogsForEvent(logs: LifeLog[], eventId: string) {
  return sortLifeLogsNewestFirst(
    logs.filter((log) => log.eventId === eventId),
  );
}

export function getLifeLogTimelineGroups(
  logs: LifeLog[],
  referenceDate = new Date(),
) {
  const today = formatCalendarDate(referenceDate);
  const yesterday = addDaysToCalendarDate(today, -1);
  const groups = new Map<string, LifeLog[]>();

  sortLifeLogsNewestFirst(logs).forEach((log) => {
    const date = formatCalendarDate(new Date(log.createdAt));
    const group = groups.get(date);
    if (group) {
      group.push(log);
    } else {
      groups.set(date, [log]);
    }
  });

  return [...groups.entries()].map(([date, groupedLogs]) => ({
    date,
    label:
      date === today
        ? "今日"
        : date === yesterday
          ? "昨日"
          : new Intl.DateTimeFormat("ja-JP", {
              month: "numeric",
              day: "numeric",
              weekday: "short",
            }).format(new Date(`${date}T12:00:00`)),
    logs: groupedLogs,
  }));
}

export function getCurrentWeekLifeLogs(
  logs: LifeLog[],
  referenceDate = new Date(),
) {
  const weekStart = getCalendarDateForWeekDay(0, 0, referenceDate);
  const weekEnd = getCalendarDateForWeekDay(0, 6, referenceDate);

  return sortLifeLogsNewestFirst(logs).filter((log) => {
    const date = formatCalendarDate(new Date(log.createdAt));
    return date >= weekStart && date <= weekEnd;
  });
}

export function formatLifeLogTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

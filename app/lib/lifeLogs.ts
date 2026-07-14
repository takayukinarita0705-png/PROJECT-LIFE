import type {
  CalendarEvent,
  LifeLog,
  LifeLogFocusArea,
  LifeLogScheduleDetails,
  LifeLogScheduleDuration,
} from "@/app/types/calendar";
import { FREE_CATEGORY_ID } from "@/app/lib/calendar";
import {
  addDaysToCalendarDate,
  formatCalendarDate,
  getCalendarDateForWeekDay,
  getCalendarDayIndex,
  getEventEndDate,
  getWeekOffsetForDate,
  parseCalendarDate,
} from "@/app/lib/date";
import { parseTime } from "@/app/lib/time";

export const LIFE_LOG_SCHEDULE_DURATION_OPTIONS: ReadonlyArray<{
  value: LifeLogScheduleDuration;
  label: string;
}> = [
  { value: 30, label: "30分後" },
  { value: 60, label: "1時間後" },
  { value: 90, label: "1時間30分後" },
  { value: 120, label: "2時間後" },
  { value: "custom", label: "カスタム" },
];

export function canScheduleLifeLog(log: LifeLog) {
  return log.status === "inbox" && !log.eventId;
}

export function getLifeLogScheduleTiming(
  date: string,
  startValue: string,
  duration: LifeLogScheduleDuration,
  customEndValue = "",
) {
  if (!parseCalendarDate(date)) return null;
  const start = parseTime(startValue);
  if (start === null || start >= 24 * 60) return null;

  let end: number;
  if (duration === "custom") {
    const customEnd = parseTime(customEndValue);
    if (customEnd === null || customEnd >= 24 * 60) return null;
    end = customEnd <= start ? customEnd + 24 * 60 : customEnd;
  } else {
    if (![30, 60, 90, 120].includes(duration)) return null;
    end = start + duration;
  }

  return {
    date,
    start,
    end,
    endDate: getEventEndDate(date, end),
  };
}

export function createLifeLogScheduledEvent(
  log: LifeLog,
  title: string,
  details: LifeLogScheduleDetails,
  eventId: string,
  referenceDate = new Date(),
): CalendarEvent | null {
  const date = parseCalendarDate(details.date);
  const endDate = parseCalendarDate(details.endDate);
  const normalizedTitle = title.trim();
  if (
    !date ||
    !endDate ||
    !normalizedTitle ||
    details.start < 0 ||
    details.start >= 24 * 60 ||
    details.end <= details.start ||
    details.endDate !== getEventEndDate(details.date, details.end)
  ) {
    return null;
  }

  return {
    id: eventId,
    title: normalizedTitle,
    categoryId: FREE_CATEGORY_ID,
    mode: "fixed",
    status: "pending",
    linkType: "none",
    offsetMinutes: 0,
    date: details.date,
    endDate: details.endDate,
    day: getCalendarDayIndex(date),
    start: details.start,
    end: details.end,
    weekOffset: getWeekOffsetForDate(date, referenceDate),
    lifeLogId: log.id,
    notificationMinutes: details.notificationMinutes,
  };
}

export type FutureLifeLogWeeklyRecord = {
  total: number;
  future: number;
  scheduled: number;
  done: number;
};

export type LifeLogFocusFilter = LifeLogFocusArea | "all";

export type InboxReviewState = {
  currentLog: LifeLog | null;
  remainingCount: number;
  isComplete: boolean;
};

export const LIFE_LOG_FOCUS_AREA_OPTIONS: ReadonlyArray<{
  value: LifeLogFocusArea;
  label: string;
}> = [
  { value: "unset", label: "未分類" },
  { value: "now", label: "🔴 今すぐやる" },
  { value: "future", label: "🟡 未来を作る" },
  { value: "review", label: "🔵 見直す" },
  { value: "discard", label: "⚪ 手放す" },
];

export const LIFE_LOG_FOCUS_FILTER_OPTIONS: ReadonlyArray<{
  value: LifeLogFocusFilter;
  label: string;
}> = [
  { value: "all", label: "すべて" },
  ...LIFE_LOG_FOCUS_AREA_OPTIONS,
];

export function getLifeLogFocusAreaLabel(focusArea: LifeLogFocusArea) {
  return (
    LIFE_LOG_FOCUS_AREA_OPTIONS.find(
      ({ value }) => value === focusArea,
    )?.label ?? "未分類"
  );
}

export function markLifeLogAsScheduled(
  log: LifeLog,
  updatedAt: string,
  eventId?: string,
): LifeLog {
  return {
    ...log,
    status: "scheduled",
    eventId: eventId ?? log.eventId,
    updatedAt,
  };
}

export function markLifeLogAsInbox(log: LifeLog, updatedAt: string): LifeLog {
  return {
    ...log,
    status: "inbox",
    eventId: undefined,
    updatedAt,
  };
}

export function getLifeLogStatusForEventStatus(
  eventStatus: "pending" | "active" | "completed" | "skipped",
): LifeLog["status"] {
  return eventStatus === "completed" ? "done" : "scheduled";
}

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

export function getInboxLifeLogs(logs: LifeLog[]) {
  return sortLifeLogsNewestFirst(logs);
}

export function getLifeLogStatusLabel(status: LifeLog["status"]) {
  switch (status) {
    case "scheduled":
      return "scheduled";
    case "done":
      return "done";
    case "inbox":
      return "inbox";
  }
}

export function getFutureLifeLogs(logs: LifeLog[]) {
  return sortLifeLogsNewestFirst(
    logs.filter((log) => log.focusArea === "future"),
  );
}

export function getFutureInboxLifeLogCount(logs: LifeLog[]) {
  return logs.filter(
    (log) => log.focusArea === "future" && log.status === "inbox",
  ).length;
}

export function getLifeLogsByFocusFilter(
  logs: LifeLog[],
  filter: LifeLogFocusFilter,
) {
  const filteredLogs =
    filter === "all"
      ? logs
      : logs.filter((log) => log.focusArea === filter);
  return sortLifeLogsNewestFirst(filteredLogs);
}

export function getUnclassifiedLifeLogs(logs: LifeLog[]) {
  return sortLifeLogsNewestFirst(
    logs.filter((log) => log.focusArea === "unset"),
  );
}

export function getInboxReviewState(logs: LifeLog[]): InboxReviewState {
  const unclassifiedLogs = getUnclassifiedLifeLogs(logs);

  return {
    currentLog: unclassifiedLogs[0] ?? null,
    remainingCount: unclassifiedLogs.length,
    isComplete: unclassifiedLogs.length === 0,
  };
}

export function classifyLifeLog(
  logs: LifeLog[],
  logId: string,
  focusArea: Exclude<LifeLogFocusArea, "unset">,
  updatedAt: string,
) {
  return logs.map((log) =>
    log.id === logId
      ? {
          ...log,
          focusArea,
          updatedAt,
        }
      : log,
  );
}

export function restoreLifeLogFocusArea(
  logs: LifeLog[],
  previousLog: LifeLog,
) {
  return logs.map((log) =>
    log.id === previousLog.id
      ? {
          ...log,
          focusArea: previousLog.focusArea,
          updatedAt: previousLog.updatedAt,
        }
      : log,
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

export function getFutureLifeLogWeeklyRecord(
  logs: LifeLog[],
  referenceDate = new Date(),
): FutureLifeLogWeeklyRecord {
  const weekLogs = getCurrentWeekLifeLogs(logs, referenceDate);

  return {
    total: weekLogs.length,
    future: weekLogs.filter((log) => log.focusArea === "future").length,
    scheduled: weekLogs.filter(
      (log) => log.status === "scheduled" || log.status === "done",
    ).length,
    done: weekLogs.filter((log) => log.status === "done").length,
  };
}

export function formatLifeLogTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatLifeLogDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

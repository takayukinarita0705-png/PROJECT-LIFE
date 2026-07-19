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

export type LifeLogDisplayGroup = {
  key: LifeLogFocusArea | "scheduled" | "done";
  label: string;
  logs: LifeLog[];
};

export type InboxReviewState = {
  currentLog: LifeLog | null;
  remainingCount: number;
  isComplete: boolean;
};

export type LifeLogLinkDiagnostic = {
  lifeLogId: string;
  status: LifeLog["status"];
  completed: boolean;
  completedAt: string | null;
  linkedScheduleId: string | null;
  scheduleStatus: CalendarEvent["status"] | null;
  scheduleCompletedAt: string | null;
  isInconsistent: boolean;
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
  const hadCompletionState =
    log.completed !== undefined ||
    log.completedAt !== undefined ||
    log.completionSource !== undefined ||
    log.completedByScheduleId !== undefined;
  const incompleteLog = { ...log };
  delete incompleteLog.completedAt;
  delete incompleteLog.completionSource;
  delete incompleteLog.completedByScheduleId;
  return {
    ...incompleteLog,
    status: "scheduled",
    ...(hadCompletionState ? { completed: false } : {}),
    eventId: eventId ?? log.eventId,
    updatedAt,
  };
}

export function markLifeLogAsInbox(log: LifeLog, updatedAt: string): LifeLog {
  const hadCompletionState =
    log.completed !== undefined ||
    log.completedAt !== undefined ||
    log.completionSource !== undefined ||
    log.completedByScheduleId !== undefined;
  const incompleteLog = { ...log };
  delete incompleteLog.completedAt;
  delete incompleteLog.completionSource;
  delete incompleteLog.completedByScheduleId;
  return {
    ...incompleteLog,
    status: "inbox",
    ...(hadCompletionState ? { completed: false } : {}),
    eventId: undefined,
    updatedAt,
  };
}

export function unlinkLifeLogFromEvent(
  log: LifeLog,
  updatedAt: string,
): LifeLog {
  return {
    ...log,
    eventId: undefined,
    updatedAt,
  };
}

export function getLifeLogForEvent(
  logs: LifeLog[],
  event: Pick<CalendarEvent, "id" | "lifeLogId">,
) {
  return (
    (event.lifeLogId
      ? logs.find((log) => log.id === event.lifeLogId)
      : undefined) ?? logs.find((log) => log.eventId === event.id)
  );
}

export function createLifeLogFromEvent(
  event: Pick<CalendarEvent, "id" | "lifeLogId">,
  logs: LifeLog[],
  title: string,
  body: string,
  id: string,
  createdAt: string,
): LifeLog | null {
  const normalizedTitle = title.trim();
  if (!normalizedTitle || getLifeLogForEvent(logs, event)) return null;

  return {
    id,
    title: normalizedTitle,
    body: body.trim(),
    status: "inbox",
    focusArea: "unset",
    eventId: event.id,
    origin: "event",
    createdAt,
    updatedAt: createdAt,
  };
}

export function linkEventToLifeLog(
  event: CalendarEvent,
  lifeLogId: string,
): CalendarEvent {
  return { ...event, lifeLogId };
}

export function unlinkEventFromLifeLog(
  event: CalendarEvent,
  lifeLogId: string,
): CalendarEvent {
  return event.lifeLogId === lifeLogId
    ? { ...event, lifeLogId: undefined }
    : event;
}

export function getLifeLogStatusForEventStatus(
  eventStatus: "pending" | "active" | "completed" | "skipped",
): LifeLog["status"] {
  return eventStatus === "completed" ? "done" : "scheduled";
}

function isLifeLogOriginSchedule(log: LifeLog, event: CalendarEvent) {
  return (
    log.origin !== "event" &&
    (log.eventId === event.id || event.lifeLogId === log.id)
  );
}

export function updateLifeLogsForScheduleStatus(
  logs: LifeLog[],
  event: CalendarEvent,
  status: CalendarEvent["status"],
  updatedAt: string,
) {
  const nextStatus = getLifeLogStatusForEventStatus(status);
  let hasChanged = false;
  const nextLogs = logs.map((log) => {
    if (!isLifeLogOriginSchedule(log, event)) return log;

    if (nextStatus === "done") {
      if (
        log.status === "done" &&
        log.completed === true &&
        log.completedAt &&
        (log.completionSource !== "schedule" ||
          log.completedByScheduleId === event.id)
      ) {
        return log;
      }
      hasChanged = true;
      return {
        ...log,
        status: "done" as const,
        completed: true,
        completedAt: event.completedAt ?? log.completedAt ?? updatedAt,
        completionSource: "schedule" as const,
        completedByScheduleId: event.id,
        eventId: event.id,
        updatedAt,
      };
    }

    if (
      log.status !== "done" ||
      log.completionSource !== "schedule" ||
      log.completedByScheduleId !== event.id
    ) {
      return log;
    }

    hasChanged = true;
    return markLifeLogAsScheduled(log, updatedAt, event.id);
  });

  return hasChanged ? nextLogs : logs;
}

export function reconcileLifeLogsWithScheduleStatuses(
  logs: LifeLog[],
  events: CalendarEvent[],
) {
  return events.reduce((currentLogs, event) => {
    if (!event.lifeLogId && !currentLogs.some((log) => log.eventId === event.id)) {
      return currentLogs;
    }
    const linkedLog = currentLogs.find((log) =>
      isLifeLogOriginSchedule(log, event),
    );
    if (!linkedLog) return currentLogs;
    const updatedAt =
      event.status === "completed"
        ? event.completedAt ?? linkedLog.completedAt ?? linkedLog.updatedAt
        : linkedLog.updatedAt;
    return updateLifeLogsForScheduleStatus(
      currentLogs,
      event,
      event.status,
      updatedAt,
    );
  }, logs);
}

export function getLifeLogLinkDiagnostics(
  logs: LifeLog[],
  events: CalendarEvent[],
): LifeLogLinkDiagnostic[] {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  return logs.flatMap((log) => {
    const event =
      (log.eventId ? eventsById.get(log.eventId) : undefined) ??
      events.find((item) => item.lifeLogId === log.id);
    if (!event || !isLifeLogOriginSchedule(log, event)) return [];
    const completed = isCompletedLifeLog(log);
    return [
      {
        lifeLogId: log.id,
        status: log.status,
        completed,
        completedAt: log.completedAt ?? null,
        linkedScheduleId: event.id,
        scheduleStatus: event.status,
        scheduleCompletedAt: event.completedAt ?? null,
        isInconsistent: event.status === "completed" && !completed,
      },
    ];
  });
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

export function isCompletedLifeLog(log: LifeLog) {
  const legacyStatus = (log as { status: unknown }).status;
  const legacyCompleted = (log as { completed?: unknown }).completed;
  return (
    legacyStatus === "done" ||
    legacyStatus === "completed" ||
    legacyCompleted === true ||
    (typeof log.completedAt === "string" &&
      !Number.isNaN(Date.parse(log.completedAt)))
  );
}

export function getIncompleteLifeLogs(logs: LifeLog[]) {
  return logs.filter((log) => !isCompletedLifeLog(log));
}

export function mergeLifeLogsPreservingLocalCompletion(
  localLogs: LifeLog[],
  remoteLogs: LifeLog[],
) {
  const merged = new Map(remoteLogs.map((log) => [log.id, log]));
  localLogs.forEach((localLog) => {
    if (localLog.status !== "done") return;
    const remoteLog = merged.get(localLog.id);
    if (
      remoteLog === undefined ||
      (remoteLog.status !== "done" &&
        Date.parse(localLog.updatedAt) >= Date.parse(remoteLog.updatedAt))
    ) {
      merged.set(localLog.id, localLog);
    }
  });
  return [...merged.values()];
}

const LIFE_LOG_DISPLAY_GROUPS: ReadonlyArray<{
  key: LifeLogDisplayGroup["key"];
  label: string;
}> = [
  { key: "now", label: "🔴 今すぐやる" },
  { key: "future", label: "🟡 未来を作る" },
  { key: "review", label: "🔵 見直す" },
  { key: "discard", label: "⚪ 手放す" },
  { key: "unset", label: "未分類" },
  { key: "scheduled", label: "予定化済み" },
  { key: "done", label: "完了" },
];

function getLifeLogDisplayGroupKey(
  log: LifeLog,
): LifeLogDisplayGroup["key"] {
  if (log.status === "done") return "done";
  if (log.status === "scheduled") return "scheduled";
  return log.focusArea;
}

function getScheduledEventTime(
  log: LifeLog,
  events: CalendarEvent[],
  referenceDate: Date,
) {
  const event =
    (log.eventId
      ? events.find((item) => item.id === log.eventId)
      : undefined) ?? events.find((item) => item.lifeLogId === log.id);
  if (!event) return Number.POSITIVE_INFINITY;

  const date =
    event.date ??
    getCalendarDateForWeekDay(
      event.weekOffset,
      event.day,
      referenceDate,
    );
  const parsedDate = parseCalendarDate(date);
  if (!parsedDate) return Number.POSITIVE_INFINITY;
  return parsedDate.getTime() + event.start * 60_000;
}

export function sortLifeLogsForDisplay(
  logs: LifeLog[],
  events: CalendarEvent[] = [],
  referenceDate = new Date(),
) {
  const groupRank = new Map(
    LIFE_LOG_DISPLAY_GROUPS.map(({ key }, index) => [key, index]),
  );

  return [...logs].sort((first, second) => {
    const firstKey = getLifeLogDisplayGroupKey(first);
    const secondKey = getLifeLogDisplayGroupKey(second);
    const rankDifference =
      (groupRank.get(firstKey) ?? Number.MAX_SAFE_INTEGER) -
      (groupRank.get(secondKey) ?? Number.MAX_SAFE_INTEGER);
    if (rankDifference !== 0) return rankDifference;

    if (firstKey === "scheduled" && secondKey === "scheduled") {
      const firstSchedule = getScheduledEventTime(
        first,
        events,
        referenceDate,
      );
      const secondSchedule = getScheduledEventTime(
        second,
        events,
        referenceDate,
      );
      if (firstSchedule !== secondSchedule) {
        return firstSchedule - secondSchedule;
      }
    }

    return Date.parse(second.createdAt) - Date.parse(first.createdAt);
  });
}

export function getLifeLogDisplayGroups(
  logs: LifeLog[],
  filter: LifeLogFocusFilter,
  events: CalendarEvent[] = [],
  referenceDate = new Date(),
): LifeLogDisplayGroup[] {
  const incompleteLogs = getIncompleteLifeLogs(logs);
  const filteredLogs =
    filter === "all"
      ? incompleteLogs
      : incompleteLogs.filter((log) => log.focusArea === filter);
  const sortedLogs = sortLifeLogsForDisplay(
    filteredLogs,
    events,
    referenceDate,
  );

  return LIFE_LOG_DISPLAY_GROUPS.flatMap(({ key, label }) => {
    const groupedLogs = sortedLogs.filter(
      (log) => getLifeLogDisplayGroupKey(log) === key,
    );
    return groupedLogs.length > 0 ? [{ key, label, logs: groupedLogs }] : [];
  });
}

export function getInboxLifeLogs(logs: LifeLog[]) {
  return sortLifeLogsNewestFirst(
    getIncompleteLifeLogs(logs),
  );
}

export function getLifeLogStatusLabel(status: LifeLog["status"]) {
  switch (status) {
    case "scheduled":
      return "予定化済み";
    case "done":
      return "ライフログ完了";
    case "inbox":
      return "未完了";
  }
}

export function getFutureLifeLogs(logs: LifeLog[]) {
  return sortLifeLogsNewestFirst(
    logs.filter(
      (log) => log.focusArea === "future" && !isCompletedLifeLog(log),
    ),
  );
}

export function getFutureInboxLifeLogCount(logs: LifeLog[]) {
  return logs.filter(
    (log) =>
      log.focusArea === "future" &&
      log.status === "inbox" &&
      !isCompletedLifeLog(log),
  ).length;
}

export function getLifeLogsByFocusFilter(
  logs: LifeLog[],
  filter: LifeLogFocusFilter,
  events: CalendarEvent[] = [],
) {
  const incompleteLogs = getIncompleteLifeLogs(logs);
  const filteredLogs =
    filter === "all"
      ? incompleteLogs
      : incompleteLogs.filter((log) => log.focusArea === filter);
  return sortLifeLogsForDisplay(filteredLogs, events);
}

export function getUnclassifiedLifeLogs(logs: LifeLog[]) {
  return sortLifeLogsNewestFirst(
    logs.filter(
      (log) => log.focusArea === "unset" && !isCompletedLifeLog(log),
    ),
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

export function getLifeLogsForEvent(
  logs: LifeLog[],
  eventId: string,
  lifeLogId?: string,
) {
  return sortLifeLogsNewestFirst(
    logs.filter(
      (log) => log.eventId === eventId || log.id === lifeLogId,
    ),
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

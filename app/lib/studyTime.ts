import { DAYS } from "@/app/lib/calendar";
import {
  addDaysToCalendarDate,
  formatCalendarDate,
  getWeekStart,
  isCalendarDate,
} from "@/app/lib/date";
import type { Category, StudyTimeRecord } from "@/app/types/calendar";

export const DAILY_STUDY_TARGET_MINUTES = 120;

export type StudyTimeDay = {
  date: string;
  label: string;
  minutes: number;
};

export type StudyTimeSummary = {
  todayMinutes: number;
  weekMinutes: number;
  streakDays: number;
  nextStreakDays: number;
  studiedToday: boolean;
  progressPercentage: number;
  days: StudyTimeDay[];
};

export function isStudyCategory(category: Category) {
  const name = category.name.trim();
  return (
    category.group === "study" ||
    name.includes("宅建") ||
    name.includes("勉強") ||
    name.includes("学習")
  );
}

export function normalizeStudyTimeRecord(
  value: unknown,
): StudyTimeRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    !isCalendarDate(record.date) ||
    typeof record.taskId !== "string" ||
    typeof record.minutes !== "number" ||
    !Number.isInteger(record.minutes) ||
    record.minutes <= 0 ||
    typeof record.createdAt !== "string" ||
    Number.isNaN(Date.parse(record.createdAt))
  ) {
    return null;
  }
  return record as StudyTimeRecord;
}

export function createStudyTimeRecord(
  taskId: string,
  date: string,
  minutes: number,
  id: string,
  createdAt: string,
) {
  return normalizeStudyTimeRecord({
    id,
    date,
    taskId,
    minutes,
    createdAt,
  });
}

function getMinutesForDates(
  records: StudyTimeRecord[],
  dates: ReadonlySet<string>,
) {
  return records.reduce(
    (total, record) =>
      dates.has(record.date) ? total + record.minutes : total,
    0,
  );
}

export function getTodayStudyMinutes(
  records: StudyTimeRecord[],
  referenceDate = new Date(),
) {
  return getMinutesForDates(
    records,
    new Set([formatCalendarDate(referenceDate)]),
  );
}

export function getWeekStudyMinutes(
  records: StudyTimeRecord[],
  referenceDate = new Date(),
) {
  const weekStart = formatCalendarDate(getWeekStart(referenceDate));
  return getMinutesForDates(
    records,
    new Set(
      DAYS.map((_, index) => addDaysToCalendarDate(weekStart, index)),
    ),
  );
}

export function getMonthStudyMinutes(
  records: StudyTimeRecord[],
  referenceDate = new Date(),
) {
  const monthPrefix = formatCalendarDate(referenceDate).slice(0, 7);
  return records.reduce(
    (total, record) =>
      record.date.startsWith(monthPrefix) ? total + record.minutes : total,
    0,
  );
}

export function getTotalStudyMinutes(records: StudyTimeRecord[]) {
  return records.reduce((total, record) => total + record.minutes, 0);
}

export function mergeStudyTimeRecords(
  localRecords: StudyTimeRecord[],
  remoteRecords: StudyTimeRecord[],
  locallyChangedTaskIds: ReadonlySet<string>,
) {
  const localByTaskId = new Map(
    localRecords.map((record) => [record.taskId, record]),
  );
  remoteRecords.forEach((record) => {
    if (
      locallyChangedTaskIds.has(record.taskId) ||
      localByTaskId.has(record.taskId)
    ) {
      return;
    }
    localByTaskId.set(record.taskId, record);
  });
  return [...localByTaskId.values()];
}

export function getStudyTimeSummary(
  records: StudyTimeRecord[],
  referenceDate = new Date(),
): StudyTimeSummary {
  const minutesByDate = new Map<string, number>();

  records.forEach((record) => {
    minutesByDate.set(
      record.date,
      (minutesByDate.get(record.date) ?? 0) + record.minutes,
    );
  });

  const today = formatCalendarDate(referenceDate);
  const todayMinutes = getTodayStudyMinutes(records, referenceDate);
  const weekStart = formatCalendarDate(getWeekStart(referenceDate));
  const days = DAYS.map((label, index) => {
    const date = addDaysToCalendarDate(weekStart, index);
    return { date, label, minutes: minutesByDate.get(date) ?? 0 };
  });
  const studiedToday = todayMinutes > 0;
  let streakDays = 0;
  let streakDate = studiedToday
    ? today
    : addDaysToCalendarDate(today, -1);
  while ((minutesByDate.get(streakDate) ?? 0) > 0) {
    streakDays += 1;
    streakDate = addDaysToCalendarDate(streakDate, -1);
  }

  return {
    todayMinutes,
    weekMinutes: getWeekStudyMinutes(records, referenceDate),
    streakDays,
    nextStreakDays: studiedToday ? streakDays : streakDays + 1,
    studiedToday,
    progressPercentage: Math.min(
      100,
      Math.round((todayMinutes / DAILY_STUDY_TARGET_MINUTES) * 100),
    ),
    days,
  };
}

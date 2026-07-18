import { DAYS } from "@/app/lib/calendar";
import {
  addDaysToCalendarDate,
  formatCalendarDate,
  getWeekStart,
  isCalendarDate,
  parseCalendarDate,
} from "@/app/lib/date";
import type {
  CalendarEvent,
  Category,
  StudyTimeRecord,
  StudyTimeSource,
} from "@/app/types/calendar";

export const DEFAULT_DAILY_STUDY_GOAL_MINUTES = 60;
export const STUDY_TIME_SOURCES: readonly StudyTimeSource[] = [
  "manual",
  "task_completion",
  "timer",
  "scheduled_duration",
];
const COMPLETION_SOURCES = new Set<StudyTimeSource>([
  "task_completion",
  "scheduled_duration",
]);
const TAKKEN_CATEGORY_IDS = new Set([
  "takken",
  "takken-law",
  "rights",
  "regulations",
  "memorization",
  "civil-law",
  "tax-other",
]);
const TAKKEN_WORDS = [
  "宅建",
  "宅地建物取引士",
  "宅建業法",
  "権利関係",
  "法令上の制限",
  "税・その他",
  "民法",
] as const;

export type StudyTask = Pick<
  CalendarEvent,
  | "id"
  | "title"
  | "categoryId"
  | "start"
  | "end"
  | "tags"
  | "routineId"
  | "taskType"
  | "durationMinutes"
  | "actualStudyMinutes"
  | "timerStudyDate"
>;

export type StudyDurationResolution = {
  minutes: number;
  source: Extract<
    StudyTimeSource,
    "task_completion" | "timer" | "scheduled_duration"
  >;
  studyDate?: string;
};

export type StudyTimeDay = {
  date: string;
  label: string;
  minutes: number;
};

export type StudyTimeSummary = {
  todayMinutes: number;
  weekMinutes: number;
  totalMinutes: number;
  dailyGoalMinutes: number;
  remainingGoalMinutes: number;
  achievedDailyGoal: boolean;
  streakDays: number;
  nextStreakDays: number;
  studiedToday: boolean;
  progressPercentage: number;
  days: StudyTimeDay[];
};

function normalizeToken(value: string) {
  return value.trim().toLocaleLowerCase("ja");
}

function includesAny(value: string, candidates: readonly string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}

function getStructuredTokens(task: StudyTask) {
  return [task.categoryId, task.routineId, task.taskType, ...(task.tags ?? [])]
    .filter((value): value is string => typeof value === "string")
    .map(normalizeToken);
}

export function isTakkenTask(task: StudyTask, category?: Category) {
  const structuredTokens = getStructuredTokens(task);
  if (
    TAKKEN_CATEGORY_IDS.has(task.categoryId) ||
    structuredTokens.some(
      (token) =>
        token === "takken" ||
        token.startsWith("takken-") ||
        TAKKEN_CATEGORY_IDS.has(token),
    )
  ) {
    return true;
  }

  const fallbackText = [category?.name, task.title, ...(task.tags ?? [])]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  return includesAny(fallbackText, TAKKEN_WORDS);
}

export function isStudyTask(task: StudyTask, category?: Category) {
  if (isTakkenTask(task, category)) return true;
  const structuredTokens = getStructuredTokens(task);
  if (
    category?.group === "study" ||
    structuredTokens.some(
      (token) => token === "study" || token === "勉強",
    )
  ) {
    return true;
  }
  const categoryName = category?.name.trim() ?? "";
  return includesAny(categoryName, ["勉強", "学習"]);
}

export function isStudyCategory(category: Category) {
  return isStudyTask(
    {
      id: category.id,
      categoryId: category.id,
      start: 0,
      end: 0,
    },
    category,
  );
}

export function getJapanStudyDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function validMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 24 * 60
  );
}

export function resolveStudyDuration(
  task: StudyTask,
  enteredMinutes?: number,
): StudyDurationResolution | null {
  if (validMinutes(task.actualStudyMinutes)) {
    return {
      minutes: task.actualStudyMinutes,
      source: "timer",
      studyDate: isCalendarDate(task.timerStudyDate)
        ? task.timerStudyDate
        : undefined,
    };
  }
  if (validMinutes(enteredMinutes)) {
    return { minutes: enteredMinutes, source: "task_completion" };
  }
  const scheduledMinutes = task.end - task.start;
  if (validMinutes(scheduledMinutes)) {
    return { minutes: scheduledMinutes, source: "scheduled_duration" };
  }
  if (validMinutes(task.durationMinutes)) {
    return {
      minutes: task.durationMinutes,
      source: "scheduled_duration",
    };
  }
  return null;
}

export function normalizeStudyTimeRecord(
  value: unknown,
): StudyTimeRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    (record.userId !== undefined && typeof record.userId !== "string") ||
    typeof record.taskId !== "string" ||
    !isCalendarDate(record.studyDate) ||
    !validMinutes(record.minutes) ||
    !STUDY_TIME_SOURCES.includes(record.source as StudyTimeSource) ||
    typeof record.createdAt !== "string" ||
    Number.isNaN(Date.parse(record.createdAt)) ||
    typeof record.updatedAt !== "string" ||
    Number.isNaN(Date.parse(record.updatedAt))
  ) {
    return null;
  }
  return record as StudyTimeRecord;
}

export function createStudyTimeRecord(input: {
  id: string;
  userId?: string;
  taskId: string;
  studyDate: string;
  minutes: number;
  source: StudyTimeSource;
  createdAt: string;
  updatedAt?: string;
}) {
  return normalizeStudyTimeRecord({
    ...input,
    updatedAt: input.updatedAt ?? input.createdAt,
  });
}

function automaticRecordKey(record: StudyTimeRecord) {
  return COMPLETION_SOURCES.has(record.source)
    ? `completion:${record.taskId}`
    : record.id;
}

export function upsertStudyTimeRecord(
  records: StudyTimeRecord[],
  nextRecord: StudyTimeRecord,
) {
  const key = automaticRecordKey(nextRecord);
  return [
    ...records.filter((record) => automaticRecordKey(record) !== key),
    nextRecord,
  ];
}

export function removeCompletionStudyTimeRecords(
  records: StudyTimeRecord[],
  taskId: string,
) {
  return records.filter(
    (record) =>
      record.taskId !== taskId || !COMPLETION_SOURCES.has(record.source),
  );
}

function getMinutesForDates(
  records: StudyTimeRecord[],
  dates: ReadonlySet<string>,
) {
  return records.reduce(
    (total, record) =>
      dates.has(record.studyDate) ? total + record.minutes : total,
    0,
  );
}

export function getDailyStudyMinutes(
  records: StudyTimeRecord[],
  date: string,
) {
  return isCalendarDate(date)
    ? getMinutesForDates(records, new Set([date]))
    : 0;
}

export function getTodayStudyMinutes(
  records: StudyTimeRecord[],
  referenceDate = new Date(),
) {
  return getDailyStudyMinutes(records, getJapanStudyDate(referenceDate));
}

export function getWeekStudyMinutes(
  records: StudyTimeRecord[],
  referenceDate = new Date(),
) {
  const japanDate = parseCalendarDate(getJapanStudyDate(referenceDate));
  const weekStart = formatCalendarDate(getWeekStart(japanDate ?? referenceDate));
  return getMinutesForDates(
    records,
    new Set(DAYS.map((_, index) => addDaysToCalendarDate(weekStart, index))),
  );
}

export function getMonthStudyMinutes(
  records: StudyTimeRecord[],
  referenceDate = new Date(),
) {
  const monthPrefix = getJapanStudyDate(referenceDate).slice(0, 7);
  return records.reduce(
    (total, record) =>
      record.studyDate.startsWith(monthPrefix)
        ? total + record.minutes
        : total,
    0,
  );
}

export function getTotalStudyMinutes(records: StudyTimeRecord[]) {
  return records.reduce((total, record) => total + record.minutes, 0);
}

export function getStudyStreak(
  records: StudyTimeRecord[],
  referenceDate = new Date(),
) {
  const minutesByDate = new Map<string, number>();
  records.forEach((record) => {
    minutesByDate.set(
      record.studyDate,
      (minutesByDate.get(record.studyDate) ?? 0) + record.minutes,
    );
  });
  const today = getJapanStudyDate(referenceDate);
  let date = (minutesByDate.get(today) ?? 0) > 0
    ? today
    : addDaysToCalendarDate(today, -1);
  let streak = 0;
  while ((minutesByDate.get(date) ?? 0) > 0) {
    streak += 1;
    date = addDaysToCalendarDate(date, -1);
  }
  return streak;
}

export function mergeStudyTimeRecords(
  localRecords: StudyTimeRecord[],
  remoteRecords: StudyTimeRecord[],
  locallyChangedTaskIds: ReadonlySet<string>,
) {
  const merged = new Map(
    localRecords.map((record) => [automaticRecordKey(record), record]),
  );
  remoteRecords.forEach((record) => {
    const key = automaticRecordKey(record);
    if (locallyChangedTaskIds.has(record.taskId) || merged.has(key)) return;
    merged.set(key, record);
  });
  return [...merged.values()];
}

export function getStudyTimeSummary(
  records: StudyTimeRecord[],
  referenceDate = new Date(),
  dailyGoalMinutes = DEFAULT_DAILY_STUDY_GOAL_MINUTES,
): StudyTimeSummary {
  const minutesByDate = new Map<string, number>();
  records.forEach((record) => {
    minutesByDate.set(
      record.studyDate,
      (minutesByDate.get(record.studyDate) ?? 0) + record.minutes,
    );
  });

  const today = getJapanStudyDate(referenceDate);
  const todayMinutes = getTodayStudyMinutes(records, referenceDate);
  const japanDate = parseCalendarDate(today);
  const weekStart = formatCalendarDate(getWeekStart(japanDate ?? referenceDate));
  const days = DAYS.map((label, index) => {
    const date = addDaysToCalendarDate(weekStart, index);
    return { date, label, minutes: minutesByDate.get(date) ?? 0 };
  });
  const studiedToday = todayMinutes > 0;
  const streakDays = getStudyStreak(records, referenceDate);
  const normalizedGoal = normalizeStudyDailyGoalMinutes(dailyGoalMinutes);

  return {
    todayMinutes,
    weekMinutes: getWeekStudyMinutes(records, referenceDate),
    totalMinutes: getTotalStudyMinutes(records),
    dailyGoalMinutes: normalizedGoal,
    remainingGoalMinutes: Math.max(0, normalizedGoal - todayMinutes),
    achievedDailyGoal: todayMinutes >= normalizedGoal,
    streakDays,
    nextStreakDays: studiedToday ? streakDays : streakDays + 1,
    studiedToday,
    progressPercentage: Math.round(
      (todayMinutes / normalizedGoal) * 100,
    ),
    days,
  };
}

export function normalizeStudyDailyGoalMinutes(value: unknown) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 24 * 60
    ? value
    : DEFAULT_DAILY_STUDY_GOAL_MINUTES;
}

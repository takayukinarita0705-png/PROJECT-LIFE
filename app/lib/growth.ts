import {
  addDaysToCalendarDate,
  resolveEventDate,
} from "@/app/lib/date";
import {
  getJapanStudyDate,
  getMonthStudyMinutes,
  getStudyHistoryEntries,
  getTotalStudyMinutes,
} from "@/app/lib/studyTime";
import type {
  CalendarEvent,
  Category,
  LifeLog,
  StudyTimeRecord,
} from "@/app/types/calendar";

const STUDY_MILESTONE_HOURS = [100, 250, 500, 1000] as const;

export type GrowthDailyPoint = {
  date: string;
  label: string;
  studyMinutes: number;
  completedTasks: number;
};

export type GrowthMilestone = {
  hours: number;
  achieved: boolean;
  remainingMinutes: number;
};

export type GrowthRecentItem = {
  id: string;
  icon: string;
  title: string;
  detail: string;
  timestamp: string;
  type: "study" | "task" | "life-log";
};

export type GrowthDashboard = {
  totalStudyMinutes: number;
  longestStudyStreak: number;
  totalCompletedTasks: number;
  totalLifeLogs: number;
  monthStudyMinutes: number;
  monthCompletedTasks: number;
  monthLifeLogs: number;
  monthRoutineAchievementRate: number;
  dailyPoints: GrowthDailyPoint[];
  milestones: GrowthMilestone[];
  recentItems: GrowthRecentItem[];
};

export function getLongestStudyStreak(records: StudyTimeRecord[]) {
  const dates = [...new Set(records.map((record) => record.studyDate))].sort();
  let longest = 0;
  let current = 0;
  let previousDate: string | null = null;

  dates.forEach((date) => {
    current =
      previousDate !== null &&
      addDaysToCalendarDate(previousDate, 1) === date
        ? current + 1
        : 1;
    longest = Math.max(longest, current);
    previousDate = date;
  });
  return longest;
}

function getCompletedEventDate(event: CalendarEvent, referenceDate: Date) {
  if (
    event.completedAt !== undefined &&
    !Number.isNaN(Date.parse(event.completedAt))
  ) {
    return getJapanStudyDate(new Date(event.completedAt));
  }
  return resolveEventDate(event, referenceDate);
}

function getLifeLogDate(log: LifeLog) {
  const createdAt = new Date(log.createdAt);
  return Number.isNaN(createdAt.getTime())
    ? log.createdAt.slice(0, 10)
    : getJapanStudyDate(createdAt);
}

function getScheduledEventTimestamp(
  event: CalendarEvent,
  referenceDate: Date,
) {
  if (
    event.completedAt !== undefined &&
    !Number.isNaN(Date.parse(event.completedAt))
  ) {
    return event.completedAt;
  }
  const eventDate = resolveEventDate(event, referenceDate);
  const start = new Date(`${eventDate}T00:00:00+09:00`);
  start.setTime(start.getTime() + event.end * 60 * 1000);
  return start.toISOString();
}

export function getGrowthDashboard(
  studyRecords: StudyTimeRecord[],
  events: CalendarEvent[],
  categories: Category[],
  logs: LifeLog[],
  referenceDate = new Date(),
): GrowthDashboard {
  const today = getJapanStudyDate(referenceDate);
  const monthPrefix = today.slice(0, 7);
  const completedEvents = events.filter(
    (event) => event.status === "completed",
  );
  const completedEventsByDate = new Map<string, number>();
  completedEvents.forEach((event) => {
    const date = getCompletedEventDate(event, referenceDate);
    completedEventsByDate.set(
      date,
      (completedEventsByDate.get(date) ?? 0) + 1,
    );
  });
  const studyMinutesByDate = new Map<string, number>();
  studyRecords.forEach((record) => {
    studyMinutesByDate.set(
      record.studyDate,
      (studyMinutesByDate.get(record.studyDate) ?? 0) + record.minutes,
    );
  });

  const dailyPoints = Array.from({ length: 30 }, (_, index) => {
    const date = addDaysToCalendarDate(today, index - 29);
    const [, month, day] = date.split("-");
    return {
      date,
      label: `${Number(month)}/${Number(day)}`,
      studyMinutes: studyMinutesByDate.get(date) ?? 0,
      completedTasks: completedEventsByDate.get(date) ?? 0,
    };
  });

  const currentMonthRoutineEvents = events.filter((event) => {
    const date = resolveEventDate(event, referenceDate);
    return (
      date.startsWith(monthPrefix) &&
      date <= today &&
      (event.source === "fixed-template" ||
        event.routineRelation !== undefined)
    );
  });
  const completedRoutineEvents = currentMonthRoutineEvents.filter(
    (event) => event.status === "completed",
  ).length;
  const totalStudyMinutes = getTotalStudyMinutes(studyRecords);
  const studyTaskIds = new Set(
    studyRecords.map((record) => record.taskId),
  );
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const studyHistory = getStudyHistoryEntries(
    studyRecords,
    events,
    categories,
  );
  const recentStudyItems: GrowthRecentItem[] = studyHistory.map((entry) => ({
    id: `study-${entry.id}`,
    icon: "📚",
    title: entry.taskTitle,
    detail: `${entry.minutes}分`,
    timestamp: entry.createdAt,
    type: "study",
  }));
  const recentTaskItems: GrowthRecentItem[] = completedEvents
    .filter((event) => !studyTaskIds.has(event.id))
    .map((event) => {
      const category = categoriesById.get(event.categoryId);
      return {
        id: `task-${event.id}`,
        icon: category?.icon ?? "✅",
        title: event.title?.trim() || category?.name || "完了した予定",
        detail: "完了",
        timestamp: getScheduledEventTimestamp(event, referenceDate),
        type: "task" as const,
      };
    });
  const recentLifeLogItems: GrowthRecentItem[] = logs.map((log) => ({
    id: `life-log-${log.id}`,
    icon: "📝",
    title: log.title?.trim() || log.body.trim() || "LifeLog",
    detail: "アイデア追加",
    timestamp: log.createdAt,
    type: "life-log",
  }));

  return {
    totalStudyMinutes,
    longestStudyStreak: getLongestStudyStreak(studyRecords),
    totalCompletedTasks: completedEvents.length,
    totalLifeLogs: logs.length,
    monthStudyMinutes: getMonthStudyMinutes(studyRecords, referenceDate),
    monthCompletedTasks: completedEvents.filter((event) =>
      getCompletedEventDate(event, referenceDate).startsWith(monthPrefix),
    ).length,
    monthLifeLogs: logs.filter((log) =>
      getLifeLogDate(log).startsWith(monthPrefix),
    ).length,
    monthRoutineAchievementRate:
      currentMonthRoutineEvents.length === 0
        ? 0
        : Math.round(
            (completedRoutineEvents / currentMonthRoutineEvents.length) * 100,
          ),
    dailyPoints,
    milestones: STUDY_MILESTONE_HOURS.map((hours) => ({
      hours,
      achieved: totalStudyMinutes >= hours * 60,
      remainingMinutes: Math.max(0, hours * 60 - totalStudyMinutes),
    })),
    recentItems: [
      ...recentStudyItems,
      ...recentTaskItems,
      ...recentLifeLogItems,
    ]
      .sort(
        (first, second) =>
          Date.parse(second.timestamp) - Date.parse(first.timestamp),
      )
      .slice(0, 10),
  };
}

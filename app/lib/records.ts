import type {
  CalendarEvent,
  Category,
  EventStatus,
  ScheduleItem,
} from "@/app/types/calendar";
import {
  addDaysToCalendarDate,
  formatCalendarDate,
  resolveEventDate,
} from "@/app/lib/date";

const MINUTES_PER_DAY = 24 * 60;
export const HABIT_EXCLUDED_CATEGORY_NAMES = new Set([
  "仕事",
  "ご飯",
  "ご飯作り",
  "お風呂",
  "睡眠",
  "通勤",
]);

export type HabitHeatmapDay = {
  date: string;
  completed: number;
  total: number;
  percentage: number | null;
  level: "none" | "zero" | "partial" | "high";
};

export function getTodayProgress(
  events: Array<{ status?: EventStatus }>,
) {
  const total = events.length;
  const completed = events.filter(
    (event) => event.status === "completed",
  ).length;
  const percentage =
    total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percentage };
}

export function getActualsByCategory(schedule: ScheduleItem[]) {
  const actualsByCategory = new Map<
    string,
    {
      categoryId: string;
      name: string;
      icon: string;
      color: string;
      minutes: number;
    }
  >();

  schedule.forEach(({ event, category }) => {
    if (event.status !== "completed") return;

    const rawDuration = event.end - event.start;
    const duration =
      rawDuration >= 0 ? rawDuration : MINUTES_PER_DAY + rawDuration;
    const current = actualsByCategory.get(category.id);
    if (current) {
      current.minutes += duration;
      return;
    }

    actualsByCategory.set(category.id, {
      categoryId: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      minutes: duration,
    });
  });

  return [...actualsByCategory.values()];
}

export function getScheduleRecord(schedule: ScheduleItem[]) {
  const total = schedule.length;
  const completed = schedule.filter(
    ({ event }) => event.status === "completed",
  ).length;
  const skipped = schedule.filter(
    ({ event }) => event.status === "skipped",
  ).length;
  const pending = total - completed - skipped;
  const actuals = getActualsByCategory(schedule);
  const totalMinutes = actuals.reduce(
    (sum, actual) => sum + actual.minutes,
    0,
  );
  const percentage =
    total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    skipped,
    pending,
    percentage,
    totalMinutes,
    actuals,
  };
}

export type ScheduleRecord = ReturnType<typeof getScheduleRecord>;

export function getCompletionStreak(
  events: CalendarEvent[],
  referenceDate = new Date(),
) {
  const completedDates = new Set(
    events
      .filter((event) => event.status === "completed")
      .map((event) => resolveEventDate(event, referenceDate)),
  );
  let streak = 0;
  let date = formatCalendarDate(referenceDate);

  while (completedDates.has(date)) {
    streak += 1;
    date = addDaysToCalendarDate(date, -1);
  }

  return streak;
}

export function getHabitHeatmap(
  events: CalendarEvent[],
  categories: Category[],
  referenceDate = new Date(),
  days = 28,
): HabitHeatmapDay[] {
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const endDate = formatCalendarDate(referenceDate);
  const dateRecords = Array.from({ length: days }, (_, index) => ({
    date: addDaysToCalendarDate(endDate, index - days + 1),
    completed: 0,
    total: 0,
  }));
  const recordsByDate = new Map(
    dateRecords.map((record) => [record.date, record]),
  );

  events.forEach((event) => {
    const category = categoryById.get(event.categoryId);
    if (
      !category ||
      HABIT_EXCLUDED_CATEGORY_NAMES.has(category.name.trim())
    ) {
      return;
    }

    const record = recordsByDate.get(
      resolveEventDate(event, referenceDate),
    );
    if (!record) return;

    record.total += 1;
    if (event.status === "completed") record.completed += 1;
  });

  return dateRecords.map(({ date, completed, total }) => {
    if (total === 0) {
      return {
        date,
        completed,
        total,
        percentage: null,
        level: "none" as const,
      };
    }

    const ratio = completed / total;
    return {
      date,
      completed,
      total,
      percentage: Math.round(ratio * 100),
      level:
        ratio >= 0.8
          ? ("high" as const)
          : completed > 0
            ? ("partial" as const)
            : ("zero" as const),
    };
  });
}

export function getWeeklyReviewMessage(percentage: number) {
  if (percentage >= 80) return "今週はかなり良いペースです";
  if (percentage >= 50) return "まずまず進められています";
  return "来週は少し予定を軽くしてもよさそうです";
}

export function formatActualMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}分`;
  if (remainingMinutes === 0) return `${hours}時間`;
  return `${hours}時間${remainingMinutes}分`;
}

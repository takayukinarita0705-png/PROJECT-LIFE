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
export const WEEKLY_GOAL_EXCLUDED_CATEGORY_NAMES = new Set([
  "仕事",
  "睡眠",
  "ご飯",
  "お風呂",
  "通勤",
]);
const PERFORMANCE_EXCLUDED_CATEGORY_NAMES = new Set(["睡眠"]);

export function isPerformanceTrackedCategory(category: Category) {
  return !PERFORMANCE_EXCLUDED_CATEGORY_NAMES.has(category.name.trim());
}

export type HabitHeatmapDay = {
  date: string;
  completed: number;
  total: number;
  percentage: number | null;
  level: "none" | "zero" | "partial" | "high";
};

export type CategoryActual = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  minutes: number;
};

export type WeeklyMvp = CategoryActual & {
  count: number;
  hasPreviousData: boolean;
  previousMinutes: number;
  differenceMinutes: number;
};

export type HabitWeeklyComparison = {
  currentMinutes: number;
  previousMinutes: number;
  differenceMinutes: number;
};

export type WeeklyCategoryGoal = {
  category: Category;
  goalMinutes: number | null;
  currentMinutes: number;
  remainingMinutes: number | null;
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
  const actualsByCategory = new Map<string, CategoryActual>();

  schedule.forEach(({ event, category }) => {
    if (
      event.status !== "completed" ||
      !isPerformanceTrackedCategory(category)
    ) {
      return;
    }

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
  const trackedSchedule = schedule.filter(({ category }) =>
    isPerformanceTrackedCategory(category),
  );
  const total = trackedSchedule.length;
  const completed = trackedSchedule.filter(
    ({ event }) => event.status === "completed",
  ).length;
  const skipped = trackedSchedule.filter(
    ({ event }) => event.status === "skipped",
  ).length;
  const pending = total - completed - skipped;
  const actuals = getActualsByCategory(trackedSchedule);
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

export function getWeeklyMvp(
  currentSchedule: ScheduleItem[],
  previousSchedule: ScheduleItem[],
): WeeklyMvp | null {
  function summarize(schedule: ScheduleItem[]) {
    const summaries = new Map<
      string,
      CategoryActual & { count: number }
    >();

    schedule.forEach(({ event, category }) => {
      if (event.status !== "completed") return;

      const rawDuration = event.end - event.start;
      const duration =
        rawDuration >= 0 ? rawDuration : MINUTES_PER_DAY + rawDuration;
      const current = summaries.get(category.id);
      if (current) {
        current.minutes += duration;
        current.count += 1;
        return;
      }

      summaries.set(category.id, {
        categoryId: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        minutes: duration,
        count: 1,
      });
    });

    return summaries;
  }

  const currentSummaries = summarize(currentSchedule);
  const winner = [...currentSummaries.values()].sort(
    (first, second) =>
      second.minutes - first.minutes ||
      second.count - first.count ||
      first.name.localeCompare(second.name, "ja"),
  )[0];
  if (!winner) return null;

  const previousSummaries = summarize(previousSchedule);
  const previousMinutes =
    previousSummaries.get(winner.categoryId)?.minutes ?? 0;

  return {
    ...winner,
    hasPreviousData: previousSummaries.size > 0,
    previousMinutes,
    differenceMinutes: winner.minutes - previousMinutes,
  };
}

export function getHabitActualRanking(actuals: CategoryActual[]) {
  return actuals
    .filter(
      (actual) =>
        actual.minutes > 0 &&
        !HABIT_EXCLUDED_CATEGORY_NAMES.has(actual.name.trim()),
    )
    .sort(
      (first, second) =>
        second.minutes - first.minutes ||
        first.name.localeCompare(second.name, "ja"),
    );
}

export function getHabitWeeklyComparison(
  currentSchedule: ScheduleItem[],
  previousSchedule: ScheduleItem[],
): HabitWeeklyComparison {
  const totalHabitMinutes = (schedule: ScheduleItem[]) =>
    getHabitActualRanking(getActualsByCategory(schedule)).reduce(
      (total, actual) => total + actual.minutes,
      0,
    );
  const currentMinutes = totalHabitMinutes(currentSchedule);
  const previousMinutes = totalHabitMinutes(previousSchedule);

  return {
    currentMinutes,
    previousMinutes,
    differenceMinutes: currentMinutes - previousMinutes,
  };
}

export function getWeeklyCategoryGoals(
  categories: Category[],
  actuals: CategoryActual[],
): WeeklyCategoryGoal[] {
  const actualMinutesByCategory = new Map(
    actuals.map((actual) => [actual.categoryId, actual.minutes]),
  );

  return categories
    .filter(
      (category) =>
        !WEEKLY_GOAL_EXCLUDED_CATEGORY_NAMES.has(category.name.trim()),
    )
    .map((category) => {
      const goalMinutes = category.weeklyGoalMinutes ?? null;
      const currentMinutes =
        actualMinutesByCategory.get(category.id) ?? 0;

      return {
        category,
        goalMinutes,
        currentMinutes,
        remainingMinutes:
          goalMinutes === null
            ? null
            : Math.max(goalMinutes - currentMinutes, 0),
      };
    });
}

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

export function formatSignedActualMinutes(minutes: number) {
  if (minutes === 0) return "±0分";
  const sign = minutes > 0 ? "+" : "-";
  return `${sign}${formatActualMinutes(Math.abs(minutes))}`;
}

import { DAYS } from "@/app/lib/calendar";
import {
  addDaysToCalendarDate,
  formatCalendarDate,
  getWeekStart,
  resolveEventDate,
} from "@/app/lib/date";
import type { CalendarEvent, Category } from "@/app/types/calendar";

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

function getRecordedEventMinutes(event: CalendarEvent) {
  const rawMinutes = event.end - event.start;
  return Math.max(0, rawMinutes >= 0 ? rawMinutes : 24 * 60 + rawMinutes);
}

export function getStudyTimeSummary(
  events: CalendarEvent[],
  categories: Category[],
  referenceDate = new Date(),
): StudyTimeSummary {
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const minutesByDate = new Map<string, number>();

  events.forEach((event) => {
    const category = categoriesById.get(event.categoryId);
    if (
      event.status !== "completed" ||
      !category ||
      !isStudyCategory(category)
    ) {
      return;
    }
    const date = resolveEventDate(event, referenceDate);
    minutesByDate.set(
      date,
      (minutesByDate.get(date) ?? 0) + getRecordedEventMinutes(event),
    );
  });

  const today = formatCalendarDate(referenceDate);
  const todayMinutes = minutesByDate.get(today) ?? 0;
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
    weekMinutes: days.reduce((total, day) => total + day.minutes, 0),
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

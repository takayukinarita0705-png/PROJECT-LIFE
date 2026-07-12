import { getFutureInboxLifeLogCount } from "@/app/lib/lifeLogs";
import {
  HABIT_EXCLUDED_CATEGORY_NAMES,
  getActualsByCategory,
} from "@/app/lib/records";
import type { LifeLog, ScheduleItem } from "@/app/types/calendar";

const MINUTES_PER_DAY = 24 * 60;

function getEventDurationMinutes({ event }: ScheduleItem) {
  const rawDuration = event.end - event.start;
  return rawDuration >= 0 ? rawDuration : MINUTES_PER_DAY + rawDuration;
}

export function getMorningSummary(
  todaySchedule: ScheduleItem[],
  logs: LifeLog[],
) {
  const trackedSchedule = todaySchedule.filter(({ category }) =>
    !HABIT_EXCLUDED_CATEGORY_NAMES.has(category.name.trim()),
  );
  const completedEvents = todaySchedule.filter(
    ({ event }) => event.status === "completed",
  ).length;
  const habitGoalMinutes = trackedSchedule.reduce(
    (total, item) => total + getEventDurationMinutes(item),
    0,
  );
  const habitActualMinutes = getActualsByCategory(trackedSchedule).reduce(
    (total, actual) => total + actual.minutes,
    0,
  );

  return {
    totalEvents: todaySchedule.length,
    completedEvents,
    remainingEvents: todaySchedule.length - completedEvents,
    habitGoalMinutes,
    habitActualMinutes,
    futureInboxCount: getFutureInboxLifeLogCount(logs),
  };
}

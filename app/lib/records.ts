import type {
  EventStatus,
  ScheduleItem,
} from "@/app/types/calendar";

const MINUTES_PER_DAY = 24 * 60;

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

export function formatActualMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}分`;
  if (remainingMinutes === 0) return `${hours}時間`;
  return `${hours}時間${remainingMinutes}分`;
}

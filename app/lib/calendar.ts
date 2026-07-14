import type {
  CalendarEvent,
  Category,
  DropTarget,
  RoutineRelation,
  TemplateEvent,
} from "@/app/types/calendar";
import {
  MINUTES_PER_ROW,
  displayRowToTimeRow,
  toMinutes,
} from "@/app/lib/time";
import {
  addDaysToCalendarDate,
  getCalendarDayIndex,
  getWeekOffsetForDate,
  getWeekStart,
  isCalendarDate,
  parseCalendarDate,
  resolveEventDate,
} from "@/app/lib/date";

export const DAYS = ["火", "水", "木", "金", "土", "日", "月"];

const BUILT_IN_CATEGORY_TIMESTAMP = "2026-07-01T00:00:00.000Z";

export const WORKDAY_ROUTINE = {
  workCategoryId: "work",
  mealCategoryId: "meal",
  bathCategoryId: "bath",
  mealDelayMinutes: 30,
} as const;

function createBuiltInCategory(
  id: string,
  name: string,
  color: string,
  icon: string,
  group: string,
): Category {
  return {
    id,
    name,
    color,
    icon,
    group,
    createdAt: BUILT_IN_CATEGORY_TIMESTAMP,
    updatedAt: BUILT_IN_CATEGORY_TIMESTAMP,
  };
}

export const CLEANING_CATEGORY = createBuiltInCategory(
  "cleaning",
  "掃除",
  "#d6a06a",
  "🧹",
  "life",
);

export const FREE_CATEGORY_ID = "free";
export const FREE_CATEGORY = createBuiltInCategory(
  FREE_CATEGORY_ID,
  "フリー",
  "#F59E0B",
  "📝",
  "other",
);

export const DEFAULT_CATEGORIES: Category[] = [
  createBuiltInCategory("work", "仕事", "#3b82f6", "💼", "work"),
  createBuiltInCategory("commute", "通勤", "#60a5fa", "🚃", "work"),
  createBuiltInCategory("wake", "起床", "#f59e0b", "☀️", "health"),
  createBuiltInCategory("takken-law", "宅建業法", "#ef4444", "📕", "study"),
  createBuiltInCategory("rights", "権利関係", "#f97316", "⚖️", "study"),
  createBuiltInCategory(
    "regulations",
    "法令上の制限",
    "#06b6d4",
    "📘",
    "study",
  ),
  createBuiltInCategory("memorization", "暗記", "#f43f5e", "🧠", "study"),
  createBuiltInCategory("meal-prep", "ご飯作り", "#eab308", "🍳", "life"),
  createBuiltInCategory("meal", "ご飯", "#f59e0b", "🍚", "life"),
  createBuiltInCategory("bath", "お風呂", "#0ea5e9", "🛁", "life"),
  createBuiltInCategory("shopping", "買い物", "#facc15", "🛒", "life"),
  CLEANING_CATEGORY,
  createBuiltInCategory("daycare", "保育園送迎", "#c084fc", "🎒", "family"),
  createBuiltInCategory("family", "家族時間", "#eab308", "👨‍👩‍👧", "family"),
  createBuiltInCategory("kids", "子どもと遊ぶ", "#f59e0b", "🧸", "family"),
  createBuiltInCategory("sleep", "睡眠", "#64748b", "🌙", "health"),
  createBuiltInCategory("running", "ランニング", "#22c55e", "🏃", "health"),
  createBuiltInCategory(
    "road-bike",
    "ロードバイク",
    "#16a34a",
    "🚴",
    "health",
  ),
  createBuiltInCategory("walk", "散歩", "#84cc16", "🚶", "health"),
  createBuiltInCategory("strength", "筋トレ", "#059669", "🏋️", "health"),
  createBuiltInCategory("game", "ゲーム", "#a855f7", "🎮", "leisure"),
  createBuiltInCategory("movie", "映画", "#8b5cf6", "🎬", "leisure"),
  createBuiltInCategory(
    "youtube",
    "YouTubeダラダラ",
    "#d946ef",
    "▶️",
    "leisure",
  ),
  createBuiltInCategory("reading", "読書", "#6366f1", "📚", "study"),
  FREE_CATEGORY,
];

export function ensureFreeCategory(categories: Category[]) {
  const currentFreeCategory = categories.find(
    (category) => category.id === FREE_CATEGORY_ID,
  );
  if (!currentFreeCategory) {
    return [...categories, { ...FREE_CATEGORY }];
  }
  if (
    currentFreeCategory.color === FREE_CATEGORY.color &&
    currentFreeCategory.icon === FREE_CATEGORY.icon
  ) {
    return categories;
  }

  return categories.map((category) =>
    category.id === FREE_CATEGORY_ID
      ? {
          ...category,
          color: FREE_CATEGORY.color,
          icon: FREE_CATEGORY.icon,
        }
      : category,
  );
}

export function normalizeNewEventTitle(
  categoryId: string,
  title?: string,
) {
  if (categoryId !== FREE_CATEGORY_ID) return undefined;

  const normalizedTitle = title?.trim() ?? "";
  return normalizedTitle || null;
}

export function getWeekStartDate(offset: number) {
  const weekStart = getWeekStart();
  weekStart.setDate(weekStart.getDate() + offset * 7);
  return weekStart;
}

export function getWeekDates(offset: number) {
  const weekStart = getWeekStartDate(offset);
  return DAYS.map((_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });
}

export function dateLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function createFixedTemplateEvents(
  secondDayOff: 0 | 2,
): TemplateEvent[] {
  const workDays = DAYS.map((_, day) => day).filter(
    (day) => day !== 1 && day !== secondDayOff,
  );
  const templateEvents: TemplateEvent[] = [];

  function addTemplateEvent(
    categoryId: string,
    day: number,
    start: number,
    end: number,
    routineRelation?: RoutineRelation,
  ) {
    templateEvents.push({
      categoryId,
      mode: "fixed",
      day,
      start,
      end,
      routineRelation,
    });
  }

  DAYS.forEach((_, day) => {
    addTemplateEvent("sleep", day, toMinutes(0), toMinutes(5));
    addTemplateEvent("wake", day, toMinutes(5), toMinutes(5, 10));
    addTemplateEvent("walk", day, toMinutes(5, 10), toMinutes(5, 30));
    addTemplateEvent("takken-law", day, toMinutes(5, 30), toMinutes(6, 10));
    addTemplateEvent("rights", day, toMinutes(6, 15), toMinutes(6, 50));
    addTemplateEvent("regulations", day, toMinutes(6, 55), toMinutes(7, 30));
    addTemplateEvent("sleep", day, toMinutes(22), toMinutes(24));
  });

  workDays.forEach((day) => {
    addTemplateEvent(
      WORKDAY_ROUTINE.mealCategoryId,
      day,
      toMinutes(7, 30),
      toMinutes(8),
    );
    addTemplateEvent(
      WORKDAY_ROUTINE.workCategoryId,
      day,
      toMinutes(9),
      toMinutes(19),
    );
    addTemplateEvent(
      WORKDAY_ROUTINE.mealCategoryId,
      day,
      toMinutes(19, 30),
      toMinutes(19, 45),
      "after-work-meal",
    );
    addTemplateEvent(
      WORKDAY_ROUTINE.bathCategoryId,
      day,
      toMinutes(19, 45),
      toMinutes(20, 10),
      "after-work-bath",
    );
  });

  return templateEvents;
}

export function eventKey(
  event: Pick<
    CalendarEvent,
    | "categoryId"
    | "date"
    | "day"
    | "weekOffset"
    | "start"
    | "end"
  >,
) {
  return [
    resolveEventDate(event),
    event.start,
    event.end,
    event.categoryId,
  ].join(":");
}

export function filterEventsByDate(
  events: CalendarEvent[],
  date: string,
  referenceDate = new Date(),
) {
  return events.filter(
    (event) => resolveEventDate(event, referenceDate) === date,
  );
}

export function filterEventsByDates(
  events: CalendarEvent[],
  dates: Iterable<string>,
  referenceDate = new Date(),
) {
  const dateKeys = new Set(dates);
  return events.filter((event) =>
    dateKeys.has(resolveEventDate(event, referenceDate)),
  );
}

export function toggleEventCompletion(
  events: CalendarEvent[],
  eventId: string,
) {
  return events.map((event) =>
    event.id === eventId
      ? {
          ...event,
          status:
            event.status === "completed"
              ? ("pending" as const)
              : ("completed" as const),
        }
      : event,
  );
}

export function toggleEventSkipped(
  events: CalendarEvent[],
  eventId: string,
) {
  return events.map((event) =>
    event.id === eventId
      ? {
          ...event,
          status:
            event.status === "skipped"
              ? ("pending" as const)
              : ("skipped" as const),
        }
      : event,
  );
}

export function resetEventStatus(
  events: CalendarEvent[],
  eventId: string,
) {
  return events.map((event) =>
    event.id === eventId && event.status !== "pending"
      ? { ...event, status: "pending" as const }
      : event,
  );
}

export function isCarryoverEligibleEvent(event: CalendarEvent) {
  return event.categoryId === FREE_CATEGORY_ID || event.lifeLogId !== undefined;
}

export function moveEventToNextDay(
  events: CalendarEvent[],
  eventId: string,
  referenceDate = new Date(),
) {
  return events.map((event) => {
    if (event.id !== eventId || !isCarryoverEligibleEvent(event)) {
      return event;
    }

    const nextDate = addDaysToCalendarDate(
      resolveEventDate(event, referenceDate),
      1,
    );
    const parsedNextDate = parseCalendarDate(nextDate);
    if (parsedNextDate === null) return event;

    return {
      ...event,
      date: nextDate,
      endDate: event.endDate
        ? addDaysToCalendarDate(event.endDate, 1)
        : undefined,
      day: getCalendarDayIndex(parsedNextDate),
      weekOffset: getWeekOffsetForDate(parsedNextDate, referenceDate),
      status: "pending" as const,
    };
  });
}

export function mergeUniqueEvents(
  current: CalendarEvent[],
  additions: CalendarEvent[],
) {
  const keys = new Set(current.map(eventKey));
  const uniqueAdditions = additions.filter((event) => {
    const key = eventKey(event);
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });

  return [...current, ...uniqueAdditions];
}

export function reconcileTemplateEvents(
  existing: CalendarEvent[],
  generated: CalendarEvent[],
) {
  const existingByKey = new Map(
    existing.map((event) => [eventKey(event), event]),
  );
  const replacementIds = new Map<string, string>();
  generated.forEach((event) => {
    const existingEvent = existingByKey.get(eventKey(event));
    if (existingEvent) replacementIds.set(event.id, existingEvent.id);
  });

  return generated.map((event) => {
    const existingEvent = existingByKey.get(eventKey(event));
    if (existingEvent) return existingEvent;

    const linkedToEventId = event.linkedToEventId
      ? replacementIds.get(event.linkedToEventId)
      : undefined;
    return linkedToEventId && linkedToEventId !== event.linkedToEventId
      ? { ...event, linkedToEventId }
      : event;
  });
}

export function preserveRemoteEventStatuses(
  localEvents: CalendarEvent[],
  remoteEvents: CalendarEvent[],
  locallyChangedStatusIds: ReadonlySet<string>,
) {
  const remoteById = new Map(
    remoteEvents.map((event) => [event.id, event]),
  );
  return localEvents.map((event) => {
    const remoteEvent = remoteById.get(event.id);
    if (
      !remoteEvent ||
      locallyChangedStatusIds.has(event.id) ||
      remoteEvent.status === event.status
    ) {
      return event;
    }
    return { ...event, status: remoteEvent.status };
  });
}

export function attachRoutineRelations(events: CalendarEvent[]) {
  const withMeals = events.map((event) => {
    if (event.categoryId !== WORKDAY_ROUTINE.mealCategoryId) return event;

    const parentWork = events.find(
      (candidate) =>
        candidate.categoryId === WORKDAY_ROUTINE.workCategoryId &&
        candidate.mode === "fixed" &&
        resolveEventDate(candidate) === resolveEventDate(event) &&
        event.start ===
          candidate.end + WORKDAY_ROUTINE.mealDelayMinutes &&
        event.end === event.start + 15,
    );
    return parentWork
      ? {
          ...event,
          mode: "linked" as const,
          linkedToEventId: parentWork.id,
          linkType: "after" as const,
          offsetMinutes: WORKDAY_ROUTINE.mealDelayMinutes,
          routineRelation: "after-work-meal" as const,
        }
      : event;
  });

  return withMeals.map((event) => {
    if (event.categoryId !== WORKDAY_ROUTINE.bathCategoryId) return event;

    const relatedMeal = withMeals.find(
      (candidate) =>
        candidate.mode === "linked" &&
        candidate.routineRelation === "after-work-meal" &&
        resolveEventDate(candidate) === resolveEventDate(event) &&
        event.start === candidate.end &&
        event.end === event.start + 25,
    );
    return relatedMeal
      ? {
          ...event,
          mode: "linked" as const,
          linkedToEventId: relatedMeal.id,
          linkType: "after" as const,
          offsetMinutes: 0,
          routineRelation: "after-work-bath" as const,
        }
      : event;
  });
}

export function getDropTarget(
  clientX: number,
  clientY: number,
): DropTarget | null {
  const cell = document.elementsFromPoint(clientX, clientY).find((element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (!element.matches("[data-calendar-cell]")) return false;

    const rect = element.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }) as HTMLElement | undefined;
  if (!cell) return null;

  const day = Number(cell.dataset.day);
  const weekOffset = Number(cell.dataset.weekOffset);
  const date = cell.dataset.date;
  const displayRow = Number(cell.dataset.displayRow);
  if (
    !isCalendarDate(date) ||
    !Number.isInteger(day) ||
    !Number.isInteger(weekOffset) ||
    !Number.isInteger(displayRow)
  ) {
    return null;
  }

  const rect = cell.getBoundingClientRect();
  const positionInRow = Math.max(
    0,
    Math.min(1, (clientY - rect.top) / rect.height),
  );
  const minuteInRow = Math.min(
    25,
    Math.round((positionInRow * MINUTES_PER_ROW) / 5) * 5,
  );
  const timeRow = displayRowToTimeRow(displayRow);

  return {
    date,
    day,
    weekOffset,
    row: timeRow,
    pointerMinute: timeRow * MINUTES_PER_ROW + minuteInRow,
  };
}

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
  isCalendarDate,
  resolveEventDate,
} from "@/app/lib/date";

export const DAYS = ["月", "火", "水", "木", "金", "土", "日"];

const BUILT_IN_CATEGORY_TIMESTAMP = "2026-07-01T00:00:00.000Z";

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

export const DEFAULT_CATEGORIES: Category[] = [
  createBuiltInCategory("work", "仕事", "#3b82f6", "💼", "work"),
  createBuiltInCategory("commute", "通勤", "#60a5fa", "🚃", "work"),
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
];

export function getMonday(offset: number) {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + offset * 7);
  return monday;
}

export function getWeekDates(offset: number) {
  const monday = getMonday(offset);
  return DAYS.map((_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

export function dateLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function createFixedTemplateEvents(
  secondDayOff: 1 | 3,
): TemplateEvent[] {
  const workDays = DAYS.map((_, day) => day).filter(
    (day) => day !== 2 && day !== secondDayOff,
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
    addTemplateEvent("walk", day, toMinutes(5), toMinutes(5, 20));
    addTemplateEvent("takken-law", day, toMinutes(5, 20), toMinutes(6, 10));
    addTemplateEvent("rights", day, toMinutes(6, 10), toMinutes(6, 50));
    addTemplateEvent("regulations", day, toMinutes(6, 50), toMinutes(7, 30));
    addTemplateEvent("sleep", day, toMinutes(22), toMinutes(24));
  });

  workDays.forEach((day) => {
    addTemplateEvent("meal", day, toMinutes(7, 30), toMinutes(8));
    addTemplateEvent("work", day, toMinutes(9), toMinutes(19));
    addTemplateEvent(
      "meal",
      day,
      toMinutes(19, 30),
      toMinutes(19, 45),
      "after-work-meal",
    );
    addTemplateEvent(
      "bath",
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

export function attachRoutineRelations(events: CalendarEvent[]) {
  const withMeals = events.map((event) => {
    if (event.categoryId !== "meal") return event;

    const parentWork = events.find(
      (candidate) =>
        candidate.categoryId === "work" &&
        candidate.mode === "fixed" &&
        resolveEventDate(candidate) === resolveEventDate(event) &&
        event.start === candidate.end + 30 &&
        event.end === event.start + 15,
    );
    return parentWork
      ? {
          ...event,
          mode: "linked" as const,
          linkedToEventId: parentWork.id,
          linkType: "after" as const,
          offsetMinutes: 30,
          routineRelation: "after-work-meal" as const,
        }
      : event;
  });

  return withMeals.map((event) => {
    if (event.categoryId !== "bath") return event;

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

export function updateRoutineManually(
  events: CalendarEvent[],
  originalRoutine: CalendarEvent,
  editedRoutine: CalendarEvent,
) {
  return events.map((event) => {
    if (event.id === originalRoutine.id) return editedRoutine;
    if (
      event.categoryId === "work" &&
      resolveEventDate(event) === resolveEventDate(originalRoutine)
    ) {
      return { ...event, routineDetached: true };
    }
    return event;
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

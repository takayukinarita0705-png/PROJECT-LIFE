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

export const DAYS = ["月", "火", "水", "木", "金", "土", "日"];

export const CLEANING_CATEGORY: Category = {
  id: "cleaning",
  name: "掃除",
  color: "#d6a06a",
  icon: "🧹",
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "work", name: "仕事", color: "#3b82f6", icon: "💼" },
  { id: "commute", name: "通勤", color: "#60a5fa", icon: "🚃" },
  { id: "takken-law", name: "宅建業法", color: "#ef4444", icon: "📕" },
  { id: "rights", name: "権利関係", color: "#f97316", icon: "⚖️" },
  { id: "regulations", name: "法令上の制限", color: "#06b6d4", icon: "📘" },
  { id: "memorization", name: "暗記", color: "#f43f5e", icon: "🧠" },
  { id: "meal-prep", name: "ご飯作り", color: "#eab308", icon: "🍳" },
  { id: "meal", name: "ご飯", color: "#f59e0b", icon: "🍚" },
  { id: "bath", name: "お風呂", color: "#0ea5e9", icon: "🛁" },
  { id: "shopping", name: "買い物", color: "#facc15", icon: "🛒" },
  CLEANING_CATEGORY,
  { id: "daycare", name: "保育園送迎", color: "#c084fc", icon: "🎒" },
  { id: "family", name: "家族時間", color: "#eab308", icon: "👨‍👩‍👧" },
  { id: "kids", name: "子どもと遊ぶ", color: "#f59e0b", icon: "🧸" },
  { id: "sleep", name: "睡眠", color: "#64748b", icon: "🌙" },
  { id: "running", name: "ランニング", color: "#22c55e", icon: "🏃" },
  { id: "road-bike", name: "ロードバイク", color: "#16a34a", icon: "🚴" },
  { id: "walk", name: "散歩", color: "#84cc16", icon: "🚶" },
  { id: "strength", name: "筋トレ", color: "#059669", icon: "🏋️" },
  { id: "game", name: "ゲーム", color: "#a855f7", icon: "🎮" },
  { id: "movie", name: "映画", color: "#8b5cf6", icon: "🎬" },
  { id: "youtube", name: "YouTubeダラダラ", color: "#d946ef", icon: "▶️" },
  { id: "reading", name: "読書", color: "#6366f1", icon: "📚" },
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
    "categoryId" | "day" | "start" | "end" | "weekOffset"
  >,
) {
  return [
    event.weekOffset,
    event.day,
    event.start,
    event.end,
    event.categoryId,
  ].join(":");
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
    if (event.categoryId !== "meal" || event.routineRelation) return event;

    const parentWork = events.find(
      (candidate) =>
        candidate.categoryId === "work" &&
        candidate.weekOffset === event.weekOffset &&
        candidate.day === event.day &&
        event.start === candidate.end + 30 &&
        event.end === event.start + 15,
    );
    return parentWork
      ? { ...event, routineRelation: "after-work-meal" as const }
      : event;
  });

  return withMeals.map((event) => {
    if (event.categoryId !== "bath" || event.routineRelation) return event;

    const relatedMeal = withMeals.find(
      (candidate) =>
        candidate.routineRelation === "after-work-meal" &&
        candidate.weekOffset === event.weekOffset &&
        candidate.day === event.day &&
        event.start === candidate.end &&
        event.end === event.start + 25,
    );
    return relatedMeal
      ? { ...event, routineRelation: "after-work-bath" as const }
      : event;
  });
}

export function updateWorkWithRelatedRoutine(
  events: CalendarEvent[],
  originalWork: CalendarEvent,
  editedWork: CalendarEvent,
) {
  if (originalWork.routineDetached) {
    return events.map((event) =>
      event.id === originalWork.id ? editedWork : event,
    );
  }

  const mealStart = editedWork.end + 30;
  const mealEnd = mealStart + 15;
  const bathEnd = mealEnd + 25;

  return events.map((event) => {
    if (event.id === originalWork.id) return editedWork;
    if (
      event.weekOffset !== originalWork.weekOffset ||
      event.day !== originalWork.day
    ) {
      return event;
    }
    if (event.routineRelation === "after-work-meal") {
      return {
        ...event,
        categoryId: "meal",
        day: editedWork.day,
        weekOffset: editedWork.weekOffset,
        start: mealStart,
        end: mealEnd,
      };
    }
    if (event.routineRelation === "after-work-bath") {
      return {
        ...event,
        categoryId: "bath",
        day: editedWork.day,
        weekOffset: editedWork.weekOffset,
        start: mealEnd,
        end: bathEnd,
      };
    }
    return event;
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
      event.weekOffset === originalRoutine.weekOffset &&
      event.day === originalRoutine.day
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
  const displayRow = Number(cell.dataset.displayRow);
  if (
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
    day,
    weekOffset,
    row: timeRow,
    pointerMinute: timeRow * MINUTES_PER_ROW + minuteInRow,
  };
}

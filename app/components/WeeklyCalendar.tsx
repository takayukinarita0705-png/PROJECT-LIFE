"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type CalendarEvent = {
  id: string;
  categoryId: string;
  day: number;
  /** 0時からの経過分 */
  start: number;
  /** 0時からの経過分。24:00は1440 */
  end: number;
  weekOffset: number;
  source?: "fixed-template";
};

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

type LegacyCalendarEvent = Omit<CalendarEvent, "categoryId"> & {
  title: string;
  color: string;
};

type CategoryDraft = {
  id: string | null;
  name: string;
  color: string;
  icon: string;
};

type TemplateEvent = Pick<
  CalendarEvent,
  "categoryId" | "day" | "start" | "end"
>;

type CalendarTemplate = {
  id: string;
  name: string;
  events: TemplateEvent[];
  categories: Category[];
};

type Draft = {
  day: number;
  start: number;
  end: number;
};

type MobileEventDraft = {
  eventId: string;
  categoryId: string;
  start: string;
  end: string;
};

type DropTarget = {
  day: number;
  row: number;
  pointerMinute: number;
};

type EventMove = {
  eventId: string;
  pointerId: number;
  startX: number;
  startY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  grabOffsetMinutes: number;
};

type SaveStatus = "saving" | "saved" | null;

type UndoSnapshot = {
  id: number;
  events: CalendarEvent[];
};

const DAYS = ["月", "火", "水", "木", "金", "土", "日"];
const STORAGE_KEY = "project-life-calendar-events";
const TEMPLATE_STORAGE_KEY = "project-life-calendar-templates";
const TEMPLATE_STORAGE_VERSION = 1;
const STORAGE_VERSION = 4;
const MINUTES_PER_ROW = 30;
const ROWS_PER_DAY = (24 * 60) / MINUTES_PER_ROW;
const DISPLAY_START_MINUTES = 5 * 60;
const DISPLAY_START_ROW = DISPLAY_START_MINUTES / MINUTES_PER_ROW;
const ROW_HEIGHT = 32;
const DISPLAY_ROWS = Array.from(
  { length: ROWS_PER_DAY },
  (_, displayRow) => displayRowToTimeRow(displayRow),
);
const CLEANING_CATEGORY: Category = {
  id: "cleaning",
  name: "掃除",
  color: "#d6a06a",
  icon: "🧹",
};

const DEFAULT_CATEGORIES: Category[] = [
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

function formatTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

function parseTime(value: string) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 24 || (hour === 24 && minute !== 0)) return null;
  return hour * 60 + minute;
}

function toMinutes(hour: number, minute = 0) {
  return hour * 60 + minute;
}

function displayRowToTimeRow(displayRow: number) {
  return (displayRow + DISPLAY_START_ROW) % ROWS_PER_DAY;
}

function minutesFromDisplayStart(minutes: number) {
  return (minutes - DISPLAY_START_MINUTES + 24 * 60) % (24 * 60);
}

function getEventPosition(event: CalendarEvent, rowStart: number) {
  return {
    top: `${((event.start - rowStart) / MINUTES_PER_ROW) * 100}%`,
    height: `${((event.end - event.start) / MINUTES_PER_ROW) * 100}%`,
  };
}

function getMonday(offset: number) {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + offset * 7);
  return monday;
}

function getWeekDates(offset: number) {
  const monday = getMonday(offset);
  return DAYS.map((_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function dateLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function isCalendarEvent(value: unknown): value is CalendarEvent {
  if (typeof value !== "object" || value === null) return false;

  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    typeof event.categoryId === "string" &&
    typeof event.day === "number" &&
    typeof event.start === "number" &&
    typeof event.end === "number" &&
    typeof event.weekOffset === "number" &&
    (event.source === undefined || event.source === "fixed-template")
  );
}

function isLegacyCalendarEvent(value: unknown): value is LegacyCalendarEvent {
  if (typeof value !== "object" || value === null) return false;

  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    typeof event.title === "string" &&
    typeof event.color === "string" &&
    typeof event.day === "number" &&
    typeof event.start === "number" &&
    typeof event.end === "number" &&
    typeof event.weekOffset === "number" &&
    (event.source === undefined || event.source === "fixed-template")
  );
}

function isCategory(value: unknown): value is Category {
  if (typeof value !== "object" || value === null) return false;

  const category = value as Record<string, unknown>;
  return (
    typeof category.id === "string" &&
    typeof category.name === "string" &&
    typeof category.color === "string" &&
    typeof category.icon === "string"
  );
}

function isTemplateEvent(value: unknown): value is TemplateEvent {
  if (typeof value !== "object" || value === null) return false;

  const event = value as Record<string, unknown>;
  return (
    typeof event.categoryId === "string" &&
    typeof event.day === "number" &&
    Number.isInteger(event.day) &&
    event.day >= 0 &&
    event.day < DAYS.length &&
    typeof event.start === "number" &&
    typeof event.end === "number" &&
    event.start >= 0 &&
    event.end <= 24 * 60 &&
    event.start < event.end
  );
}

function isCalendarTemplate(value: unknown): value is CalendarTemplate {
  if (typeof value !== "object" || value === null) return false;

  const template = value as Record<string, unknown>;
  return (
    typeof template.id === "string" &&
    typeof template.name === "string" &&
    Array.isArray(template.events) &&
    template.events.every(isTemplateEvent) &&
    Array.isArray(template.categories) &&
    template.categories.every(isCategory)
  );
}

function createFixedTemplateEvents(secondDayOff: 1 | 3): TemplateEvent[] {
  const workDays = DAYS.map((_, day) => day).filter(
    (day) => day !== 2 && day !== secondDayOff,
  );
  const templateEvents: TemplateEvent[] = [];

  function addTemplateEvent(
    categoryId: string,
    day: number,
    start: number,
    end: number,
  ) {
    templateEvents.push({ categoryId, day, start, end });
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
    addTemplateEvent("meal", day, toMinutes(19, 30), toMinutes(19, 45));
    addTemplateEvent("bath", day, toMinutes(19, 45), toMinutes(20, 10));
  });

  return templateEvents;
}

function eventKey(
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

function mergeUniqueEvents(current: CalendarEvent[], additions: CalendarEvent[]) {
  const keys = new Set(current.map(eventKey));
  const uniqueAdditions = additions.filter((event) => {
    const key = eventKey(event);
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });

  return [...current, ...uniqueAdditions];
}

function migrateLegacyEvents(
  legacyEvents: LegacyCalendarEvent[],
  usesThirtyMinuteRows: boolean,
) {
  const categories = DEFAULT_CATEGORIES.map((category) => ({ ...category }));
  const events = legacyEvents.map<CalendarEvent>((event) => {
    let category = categories.find((item) => item.name === event.title);

    if (!category) {
      category = {
        id: `migrated-${crypto.randomUUID()}`,
        name: event.title,
        color: event.color,
        icon: "•",
      };
      categories.push(category);
    }

    return {
      id: event.id,
      categoryId: category.id,
      day: event.day,
      start: usesThirtyMinuteRows
        ? event.start * MINUTES_PER_ROW
        : event.start,
      end: usesThirtyMinuteRows
        ? event.end * MINUTES_PER_ROW
        : event.end,
      weekOffset: event.weekOffset,
      source: event.source,
    };
  });

  return {
    categories,
    events: mergeUniqueEvents([], events),
  };
}

function getDropTarget(clientX: number, clientY: number): DropTarget | null {
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
  const displayRow = Number(cell.dataset.displayRow);
  if (!Number.isInteger(day) || !Number.isInteger(displayRow)) return null;

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
    row: timeRow,
    pointerMinute: timeRow * MINUTES_PER_ROW + minuteInRow,
  };
}

export default function WeeklyCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] =
    useState<Category[]>(DEFAULT_CATEGORIES);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const [templates, setTemplates] = useState<CalendarTemplate[]>([]);
  const [hasLoadedTemplates, setHasLoadedTemplates] = useState(false);

  const [dragStart, setDragStart] = useState<{ day: number; row: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ day: number; row: number } | null>(null);
  const [eventMove, setEventMove] = useState<EventMove | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mobileEventDraft, setMobileEventDraft] =
    useState<MobileEventDraft | null>(null);
  const [mobileEditError, setMobileEditError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("work");
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(
    null,
  );
  const dragGhostRef = useRef<HTMLDivElement>(null);
  const eventMoveDidMoveRef = useRef(false);
  const undoTimerRef = useRef<number | null>(null);
  const undoIdRef = useRef(0);

  const weekDates = getWeekDates(weekOffset);
  const visibleEvents = hasLoadedEvents
    ? events.filter((e) => e.weekOffset === weekOffset)
    : [];
  const movingCalendarEvent = eventMove
    ? events.find((event) => event.id === eventMove.eventId) ?? null
    : null;
  const movingCategory = movingCalendarEvent
    ? categories.find(
        (category) => category.id === movingCalendarEvent.categoryId,
      ) ?? null
    : null;
  const activeCategoryId = categories.some(
    (category) => category.id === selectedCategoryId,
  )
    ? selectedCategoryId
    : categories[0]?.id ?? "";
  const currentDay =
    currentTime === null ? null : (currentTime.getDay() + 6) % DAYS.length;
  const currentMinutes =
    currentTime === null
      ? null
      : currentTime.getHours() * 60 +
        currentTime.getMinutes() +
        currentTime.getSeconds() / 60;
  const todaySchedule =
    currentDay === null || !hasLoadedEvents
      ? []
      : events
          .filter(
            (event) => event.weekOffset === 0 && event.day === currentDay,
          )
          .flatMap((event) => {
            const category = categories.find(
              (item) => item.id === event.categoryId,
            );
            return category ? [{ event, category }] : [];
          })
          .sort(
            (a, b) =>
              minutesFromDisplayStart(a.event.start) -
              minutesFromDisplayStart(b.event.start),
          );
  const currentScheduleItem =
    currentMinutes === null
      ? undefined
      : todaySchedule.find(
          ({ event }) =>
            event.start <= currentMinutes && currentMinutes < event.end,
        );

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      try {
        const storedEvents = localStorage.getItem(STORAGE_KEY);

        if (storedEvents !== null) {
          const storedData: unknown = JSON.parse(storedEvents);

          if (
            Array.isArray(storedData) &&
            storedData.every(isLegacyCalendarEvent)
          ) {
            const migrated = migrateLegacyEvents(storedData, true);
            setCategories(migrated.categories);
            setEvents(migrated.events);
          } else if (
            typeof storedData === "object" &&
            storedData !== null &&
            "version" in storedData &&
            storedData.version === STORAGE_VERSION &&
            "events" in storedData &&
            Array.isArray(storedData.events) &&
            storedData.events.every(isCalendarEvent) &&
            "categories" in storedData &&
            Array.isArray(storedData.categories) &&
            storedData.categories.every(isCategory)
          ) {
            setCategories(storedData.categories);
            setEvents(mergeUniqueEvents([], storedData.events));
          } else if (
            typeof storedData === "object" &&
            storedData !== null &&
            "version" in storedData &&
            storedData.version === 3 &&
            "events" in storedData &&
            Array.isArray(storedData.events) &&
            storedData.events.every(isCalendarEvent) &&
            "categories" in storedData &&
            Array.isArray(storedData.categories) &&
            storedData.categories.every(isCategory)
          ) {
            const hasCleaningCategory = storedData.categories.some(
              (category) => category.id === CLEANING_CATEGORY.id,
            );
            setCategories(
              hasCleaningCategory
                ? storedData.categories
                : [...storedData.categories, { ...CLEANING_CATEGORY }],
            );
            setEvents(mergeUniqueEvents([], storedData.events));
          } else if (
            typeof storedData === "object" &&
            storedData !== null &&
            "version" in storedData &&
            storedData.version === 2 &&
            "events" in storedData &&
            Array.isArray(storedData.events) &&
            storedData.events.every(isLegacyCalendarEvent)
          ) {
            const migrated = migrateLegacyEvents(storedData.events, false);
            setCategories(migrated.categories);
            setEvents(migrated.events);
          }
        }

        const storedTemplates = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        if (storedTemplates !== null) {
          const storedTemplateData: unknown = JSON.parse(storedTemplates);
          if (
            typeof storedTemplateData === "object" &&
            storedTemplateData !== null &&
            "version" in storedTemplateData &&
            storedTemplateData.version === TEMPLATE_STORAGE_VERSION &&
            "templates" in storedTemplateData &&
            Array.isArray(storedTemplateData.templates) &&
            storedTemplateData.templates.every(isCalendarTemplate)
          ) {
            setTemplates(storedTemplateData.templates);
          }
        }
      } catch (error) {
        console.error("予定データの復元に失敗しました。", error);
      } finally {
        setHasLoadedEvents(true);
        setHasLoadedTemplates(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedEvents) return;

    let persistTimer: number | undefined;
    let hideTimer: number | undefined;
    const savingTimer = window.setTimeout(() => {
      setSaveStatus("saving");

      persistTimer = window.setTimeout(() => {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              version: STORAGE_VERSION,
              categories,
              events,
            }),
          );
          setSaveStatus("saved");
          hideTimer = window.setTimeout(() => setSaveStatus(null), 2000);
        } catch (error) {
          setSaveStatus(null);
          console.error("予定データの保存に失敗しました。", error);
        }
      }, 120);
    }, 0);

    return () => {
      window.clearTimeout(savingTimer);
      if (persistTimer !== undefined) window.clearTimeout(persistTimer);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, [categories, events, hasLoadedEvents]);

  useEffect(() => {
    if (!hasLoadedTemplates) return;

    try {
      localStorage.setItem(
        TEMPLATE_STORAGE_KEY,
        JSON.stringify({
          version: TEMPLATE_STORAGE_VERSION,
          templates,
        }),
      );
    } catch (error) {
      console.error("テンプレートの保存に失敗しました。", error);
    }
  }, [hasLoadedTemplates, templates]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const updateCurrentTime = () => {
      if (!cancelled) setCurrentTime(new Date());
    };

    queueMicrotask(updateCurrentTime);
    const timer = window.setInterval(updateCurrentTime, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  function showUndo(previousEvents: CalendarEvent[]) {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
    }

    undoIdRef.current += 1;
    setUndoSnapshot({
      id: undoIdRef.current,
      events: previousEvents,
    });
    undoTimerRef.current = window.setTimeout(() => {
      setUndoSnapshot(null);
      undoTimerRef.current = null;
    }, 5000);
  }

  function clearUndo() {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoSnapshot(null);
  }

  function undoLastOperation() {
    if (!undoSnapshot) return;
    const previousEvents = undoSnapshot.events;
    clearUndo();
    setEvents(previousEvents);
  }

  function startDrag(day: number, displayRow: number) {
    setDragStart({ day, row: displayRow });
    setDragCurrent({ day, row: displayRow });
  }

  function moveDrag(day: number, displayRow: number) {
    if (!dragStart || dragStart.day !== day) return;
    setDragCurrent({ day, row: displayRow });
  }

  function endDrag() {
    if (!dragStart || !dragCurrent) return;
    const firstDisplayRow = Math.min(dragStart.row, dragCurrent.row);
    const lastDisplayRow = Math.max(dragStart.row, dragCurrent.row);
    const start =
      displayRowToTimeRow(firstDisplayRow) * MINUTES_PER_ROW;
    const end =
      (displayRowToTimeRow(lastDisplayRow) + 1) * MINUTES_PER_ROW;
    if (end > start) {
      setDraft({ day: dragStart.day, start, end });
    }
    setDragStart(null);
    setDragCurrent(null);
  }

  function isSelecting(day: number, displayRow: number) {
    if (!dragStart || !dragCurrent || dragStart.day !== day) return false;
    const start = Math.min(dragStart.row, dragCurrent.row);
    const end = Math.max(dragStart.row, dragCurrent.row);
    return displayRow >= start && displayRow <= end;
  }

  function startEventMove(
    event: CalendarEvent,
    pointerEvent: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (pointerEvent.button !== 0) return;

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);

    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    const duration = event.end - event.start;
    const offsetY = Math.max(
      0,
      Math.min(rect.height, pointerEvent.clientY - rect.top),
    );

    setDragStart(null);
    setDragCurrent(null);
    eventMoveDidMoveRef.current = false;
    setEventMove({
      eventId: event.id,
      pointerId: pointerEvent.pointerId,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      grabOffsetMinutes: (offsetY / rect.height) * duration,
    });
    setDropTarget(getDropTarget(pointerEvent.clientX, pointerEvent.clientY));
  }

  function moveEvent(pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    if (!eventMove || pointerEvent.pointerId !== eventMove.pointerId) return;

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();

    const distance = Math.hypot(
      pointerEvent.clientX - eventMove.startX,
      pointerEvent.clientY - eventMove.startY,
    );
    if (!eventMoveDidMoveRef.current && distance < 4) return;
    eventMoveDidMoveRef.current = true;

    if (dragGhostRef.current) {
      const x = pointerEvent.clientX - eventMove.startX;
      const y = pointerEvent.clientY - eventMove.startY;
      dragGhostRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    const target = getDropTarget(pointerEvent.clientX, pointerEvent.clientY);
    setDropTarget((current) => {
      if (
        current?.day === target?.day &&
        current?.row === target?.row &&
        current?.pointerMinute === target?.pointerMinute
      ) {
        return current;
      }
      return target;
    });
  }

  function finishEventMove(
    pointerEvent: ReactPointerEvent<HTMLDivElement>,
    shouldMove: boolean,
  ) {
    if (!eventMove || pointerEvent.pointerId !== eventMove.pointerId) return;

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();

    const target = shouldMove && eventMoveDidMoveRef.current
      ? getDropTarget(pointerEvent.clientX, pointerEvent.clientY)
      : null;

    if (target) {
      const event = events.find((item) => item.id === eventMove.eventId);
      if (event) {
        const duration = event.end - event.start;
        const unclampedStart =
          target.pointerMinute - eventMove.grabOffsetMinutes;
        const snappedStart = Math.round(unclampedStart / 5) * 5;
        const start = Math.max(
          0,
          Math.min(24 * 60 - duration, snappedStart),
        );
        const movedEvent = {
          ...event,
          day: target.day,
          start,
          end: start + duration,
        };
        const isDuplicate = events.some(
          (item) =>
            item.id !== event.id && eventKey(item) === eventKey(movedEvent),
        );

        if (
          !isDuplicate &&
          (event.day !== movedEvent.day || event.start !== movedEvent.start)
        ) {
          showUndo(events);
          setEvents(
            events.map((item) =>
              item.id === event.id ? movedEvent : item,
            ),
          );
        }
      }
    }

    setEventMove(null);
    setDropTarget(null);
    eventMoveDidMoveRef.current = false;
  }

  function addEvent() {
    if (!draft || !activeCategoryId) {
      return;
    }
    const nextEvents = mergeUniqueEvents(events, [
      {
        id: crypto.randomUUID(),
        categoryId: activeCategoryId,
        day: draft.day,
        start: draft.start,
        end: draft.end,
        weekOffset,
      },
    ]);

    if (nextEvents.length !== events.length) {
      showUndo(events);
      setEvents(nextEvents);
    }

    setDraft(null);
  }

  function deleteEvent(id: string) {
    const nextEvents = events.filter((event) => event.id !== id);
    if (nextEvents.length !== events.length) {
      showUndo(events);
      setEvents(nextEvents);
    }
    setDragStart(null);
    setDragCurrent(null);
    setDraft(null);
  }

  function openMobileEventEditor(event: CalendarEvent) {
    setMobileEditError("");
    setMobileEventDraft({
      eventId: event.id,
      categoryId: event.categoryId,
      start: formatTime(event.start),
      end: formatTime(event.end),
    });
  }

  function shiftMobileEventDraft(offsetMinutes: number) {
    if (!mobileEventDraft) return;

    const start = parseTime(mobileEventDraft.start);
    const end = parseTime(mobileEventDraft.end);
    if (start === null || end === null || end <= start) {
      setMobileEditError("時刻を HH:MM 形式で正しく入力してください。");
      return;
    }

    const duration = end - start;
    const shiftedStart = Math.max(
      0,
      Math.min(24 * 60 - duration, start + offsetMinutes),
    );
    setMobileEditError("");
    setMobileEventDraft({
      ...mobileEventDraft,
      start: formatTime(shiftedStart),
      end: formatTime(shiftedStart + duration),
    });
  }

  function saveMobileEventEdit() {
    if (!mobileEventDraft) return;

    const start = parseTime(mobileEventDraft.start);
    const end = parseTime(mobileEventDraft.end);
    if (start === null || end === null || end <= start) {
      setMobileEditError(
        "開始・終了時刻を HH:MM 形式で正しく入力してください。",
      );
      return;
    }

    const event = events.find(
      (item) => item.id === mobileEventDraft.eventId,
    );
    if (!event) {
      setMobileEventDraft(null);
      return;
    }

    const editedEvent: CalendarEvent = {
      ...event,
      categoryId: mobileEventDraft.categoryId,
      start,
      end,
    };
    const isDuplicate = events.some(
      (item) =>
        item.id !== event.id && eventKey(item) === eventKey(editedEvent),
    );
    if (isDuplicate) {
      setMobileEditError("同じ時間に同じ予定がすでにあります。");
      return;
    }

    if (
      event.categoryId !== editedEvent.categoryId ||
      event.start !== editedEvent.start ||
      event.end !== editedEvent.end
    ) {
      showUndo(events);
      setEvents(
        events.map((item) =>
          item.id === event.id ? editedEvent : item,
        ),
      );
    }
    setMobileEventDraft(null);
    setMobileEditError("");
  }

  function deleteMobileEvent() {
    if (!mobileEventDraft) return;
    deleteEvent(mobileEventDraft.eventId);
    setMobileEventDraft(null);
    setMobileEditError("");
  }

  function createNextWeek() {
    clearUndo();
    const thisWeekEvents = events.filter((e) => e.weekOffset === weekOffset);
    const copied = thisWeekEvents.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      weekOffset: weekOffset + 1,
    }));

    setEvents((prev) => mergeUniqueEvents(prev, copied));
    setWeekOffset((prev) => prev + 1);
  }

  function applyTemplate(
    templateEvents: TemplateEvent[],
    templateCategories: Category[],
  ) {
    clearUndo();
    const nextEvents = templateEvents.map<CalendarEvent>((event) => ({
      ...event,
      id: crypto.randomUUID(),
      weekOffset,
      source: "fixed-template",
    }));

    const requiredCategoryIds = new Set(
      templateEvents.map((event) => event.categoryId),
    );
    const missingCategories = templateCategories.filter(
      (category) =>
        requiredCategoryIds.has(category.id) &&
        !categories.some((item) => item.id === category.id),
    );
    if (missingCategories.length > 0) {
      setCategories((current) => [...current, ...missingCategories]);
    }

    setEvents((prev) => {
      const withoutCurrentTemplate = prev.filter(
        (event) =>
          event.weekOffset !== weekOffset || event.source !== "fixed-template",
      );
      return mergeUniqueEvents(withoutCurrentTemplate, nextEvents);
    });
  }

  function applyFixedTemplate(secondDayOff: 1 | 3) {
    applyTemplate(createFixedTemplateEvents(secondDayOff), DEFAULT_CATEGORIES);
  }

  function saveCurrentWeekAsTemplate() {
    const currentWeekEvents = events.filter(
      (event) => event.weekOffset === weekOffset,
    );
    if (currentWeekEvents.length === 0) {
      window.alert("現在の週に保存できる予定がありません。");
      return;
    }

    const suggestedName = `${dateLabel(weekDates[0])}〜${dateLabel(weekDates[6])}`;
    const enteredName = window.prompt("テンプレート名を入力してください", suggestedName);
    const name = enteredName?.trim();
    if (!name) return;

    const templateEvents = currentWeekEvents.map<TemplateEvent>((event) => ({
      categoryId: event.categoryId,
      day: event.day,
      start: event.start,
      end: event.end,
    }));
    const requiredCategoryIds = new Set(
      templateEvents.map((event) => event.categoryId),
    );
    const templateCategories = categories
      .filter((category) => requiredCategoryIds.has(category.id))
      .map((category) => ({ ...category }));

    setTemplates((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        events: templateEvents,
        categories: templateCategories,
      },
    ]);
  }

  function deleteTemplate(template: CalendarTemplate) {
    if (!window.confirm(`テンプレート「${template.name}」を削除しますか？`)) {
      return;
    }
    setTemplates((current) =>
      current.filter((item) => item.id !== template.id),
    );
  }

  function startAddingCategory() {
    setCategoryDraft({
      id: null,
      name: "",
      color: "#3b82f6",
      icon: "✨",
    });
  }

  function startEditingCategory(category: Category) {
    setCategoryDraft({ ...category });
  }

  function saveCategory() {
    if (!categoryDraft) return;
    const name = categoryDraft.name.trim();
    const icon = categoryDraft.icon.trim() || "•";
    if (!name) return;

    if (categoryDraft.id) {
      setCategories((current) =>
        current.map((category) =>
          category.id === categoryDraft.id
            ? {
                ...category,
                name,
                color: categoryDraft.color,
                icon,
              }
            : category,
        ),
      );
    } else {
      const category: Category = {
        id: `custom-${crypto.randomUUID()}`,
        name,
        color: categoryDraft.color,
        icon,
      };
      setCategories((current) => [...current, category]);
      setSelectedCategoryId(category.id);
    }

    setCategoryDraft(null);
  }

  function deleteCategory(category: Category) {
    const relatedEventCount = events.filter(
      (event) => event.categoryId === category.id,
    ).length;
    const message =
      relatedEventCount > 0
        ? `「${category.name}」と、このカテゴリを使う予定${relatedEventCount}件を削除しますか？`
        : `「${category.name}」を削除しますか？`;

    if (!window.confirm(message)) return;

    clearUndo();
    setCategories((current) =>
      current.filter((item) => item.id !== category.id),
    );
    setEvents((current) =>
      current.filter((event) => event.categoryId !== category.id),
    );
    if (activeCategoryId === category.id) {
      const nextCategory = categories.find((item) => item.id !== category.id);
      setSelectedCategoryId(nextCategory?.id ?? "");
    }
    if (categoryDraft?.id === category.id) {
      setCategoryDraft(null);
    }
  }

  return (
    <div className="weekly-calendar">
      <section className="md:hidden">
        <header className="mb-3">
          <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
            TODAY
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h2 className="text-2xl font-bold text-slate-900">
              今日のスケジュール
            </h2>
            {currentTime && currentDay !== null && (
              <p className="shrink-0 text-sm font-bold text-slate-500">
                {dateLabel(currentTime)}（{DAYS[currentDay]}）
              </p>
            )}
          </div>
        </header>

        {!hasLoadedEvents || currentDay === null ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            予定を読み込んでいます…
          </div>
        ) : todaySchedule.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            今日の予定はありません
          </div>
        ) : (
          <div className="grid gap-1.5">
            {todaySchedule.map(({ event, category }) => {
              const isCurrent = currentScheduleItem?.event.id === event.id;

              return (
                <button
                  type="button"
                  key={event.id}
                  aria-current={isCurrent ? "time" : undefined}
                  onClick={() => openMobileEventEditor(event)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border border-l-4 border-slate-200 bg-white px-3 py-2 text-left shadow-sm active:scale-[0.99] ${
                    isCurrent
                      ? "ring-2 ring-rose-300 ring-offset-1"
                      : ""
                  }`}
                  style={{ borderLeftColor: category.color }}
                >
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg text-white"
                    style={{ background: category.color }}
                  >
                    {category.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-bold text-slate-900">
                        {category.name}
                      </h3>
                      {isCurrent && (
                        <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                          進行中
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium tabular-nums text-slate-500">
                      {formatTime(event.start)}〜{formatTime(event.end)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-slate-300">編集 ›</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {mobileEventDraft && (
        <div className="fixed inset-0 z-[140] flex items-end bg-slate-950/50 p-3 backdrop-blur-sm md:hidden">
          <div className="w-full rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">予定を編集</h3>
                <p className="text-xs text-slate-500">
                  時刻の移動は30分単位で調整できます
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileEventDraft(null);
                  setMobileEditError("");
                }}
                aria-label="編集を閉じる"
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-500"
              >
                ✕
              </button>
            </div>

            <label className="mt-4 block text-sm font-bold text-slate-700">
              予定
            </label>
            <select
              value={mobileEventDraft.categoryId}
              onChange={(event) =>
                setMobileEventDraft({
                  ...mobileEventDraft,
                  categoryId: event.target.value,
                })
              }
              className="mt-1 w-full rounded-xl border p-3 text-slate-900"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm font-bold text-slate-700">
                開始
                <input
                  value={mobileEventDraft.start}
                  onChange={(event) =>
                    setMobileEventDraft({
                      ...mobileEventDraft,
                      start: event.target.value,
                    })
                  }
                  inputMode="numeric"
                  placeholder="09:00"
                  className="mt-1 w-full rounded-xl border p-3 font-mono text-slate-900"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                終了
                <input
                  value={mobileEventDraft.end}
                  onChange={(event) =>
                    setMobileEventDraft({
                      ...mobileEventDraft,
                      end: event.target.value,
                    })
                  }
                  inputMode="numeric"
                  placeholder="10:00"
                  className="mt-1 w-full rounded-xl border p-3 font-mono text-slate-900"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => shiftMobileEventDraft(-30)}
                className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700 active:bg-slate-200"
              >
                ↑ 30分早める
              </button>
              <button
                type="button"
                onClick={() => shiftMobileEventDraft(30)}
                className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700 active:bg-slate-200"
              >
                ↓ 30分遅らせる
              </button>
            </div>

            {mobileEditError && (
              <p className="mt-3 text-sm font-bold text-red-600">
                {mobileEditError}
              </p>
            )}

            <div className="mt-5 grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                onClick={deleteMobileEvent}
                className="rounded-xl bg-red-50 px-4 py-3 font-bold text-red-600"
              >
                削除
              </button>
              <button
                type="button"
                onClick={saveMobileEventEdit}
                className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
              >
                変更を保存
              </button>
            </div>
          </div>
        </div>
      )}

      {undoSnapshot && (
        <div className="undo-toast-lifetime fixed bottom-5 left-1/2 z-[150] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-900/95 px-4 py-3 text-sm text-white shadow-2xl md:hidden">
          <span>予定を変更しました</span>
          <button
            type="button"
            onClick={undoLastOperation}
            className="rounded-lg bg-white/15 px-3 py-1.5 font-bold text-blue-200"
          >
            元に戻す
          </button>
        </div>
      )}

      <div className="hidden md:block">
      <div className="mb-4 rounded-xl bg-white p-4 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">週間スケジュール</h2>
            <p className="text-sm text-slate-500">
              {dateLabel(weekDates[0])}〜{dateLabel(weekDates[6])}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="rounded-xl border px-4 py-2 font-bold text-slate-700"
            >
              ← 前週
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"
            >
              今週
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="rounded-xl border px-4 py-2 font-bold text-slate-700"
            >
              次週 →
            </button>
            <button
              onClick={() => {
                setCategoryDraft(null);
                setIsCategoryManagerOpen(true);
              }}
              className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 font-bold text-violet-700"
            >
              カテゴリ管理
            </button>
            <button onClick={createNextWeek} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">
              来週を作成
            </button>
            <button
              onClick={() => applyFixedTemplate(1)}
              disabled={!hasLoadedEvents}
              className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white disabled:opacity-50"
            >
              火曜休みテンプレート
            </button>
            <button
              onClick={() => applyFixedTemplate(3)}
              disabled={!hasLoadedEvents}
              className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50"
            >
              木曜休みテンプレート
            </button>
            <button
              onClick={saveCurrentWeekAsTemplate}
              disabled={!hasLoadedEvents || !hasLoadedTemplates}
              className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 font-bold text-indigo-700 disabled:opacity-50"
            >
              現在の1週間をテンプレート保存
            </button>
          </div>
        </div>

        {templates.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="mb-2 text-sm font-bold text-slate-600">
              保存したテンプレート
            </p>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex overflow-hidden rounded-xl border border-slate-300 bg-white"
                >
                  <button
                    onClick={() =>
                      applyTemplate(template.events, template.categories)
                    }
                    disabled={!hasLoadedEvents}
                    className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    title={`${template.name}を適用`}
                  >
                    {template.name}
                  </button>
                  <button
                    onClick={() => deleteTemplate(template)}
                    className="border-l border-slate-200 px-2 py-2 text-sm text-red-500 hover:bg-red-50"
                    aria-label={`${template.name}を削除`}
                    title="削除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="overflow-auto rounded-xl border border-gray-700 bg-white select-none"
        onMouseLeave={() => {
          setDragStart(null);
          setDragCurrent(null);
        }}
      >
        <table className="border-collapse min-w-full">
          <thead>
            <tr>
              <th className="w-20 border bg-gray-900 text-white">時間</th>
              {DAYS.map((day, i) => (
                <th
                  key={day}
                  className="h-14 min-w-[140px] border bg-gray-900 text-white"
                >
                  <div>{day}</div>
                  <div className="text-xs text-slate-300">{dateLabel(weekDates[i])}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {DISPLAY_ROWS.map((row, displayRow) => (
              <tr key={row} style={{ height: ROW_HEIGHT }}>
                <td
                  className="border bg-gray-100 p-1 text-xs text-gray-700"
                  style={{
                    height: ROW_HEIGHT,
                  }}
                >
                  {formatTime(row * MINUTES_PER_ROW)}
                </td>

                {DAYS.map((_, day) => {
                  const rowStart = row * MINUTES_PER_ROW;
                  const rowEnd = rowStart + MINUTES_PER_ROW;
                  const eventsStartingInRow = visibleEvents.filter(
                    (event) =>
                      event.day === day &&
                      event.start >= rowStart &&
                      event.start < rowEnd,
                  );
                  const selecting = isSelecting(day, displayRow);
                  const isDropTarget =
                    dropTarget?.day === day && dropTarget.row === row;
                  const showsCurrentTime =
                    weekOffset === 0 &&
                    currentDay === day &&
                    currentMinutes !== null &&
                    currentMinutes >= rowStart &&
                    currentMinutes < rowEnd;
                  const currentTimeTop =
                    currentMinutes === null
                      ? "0%"
                      : `${((currentMinutes - rowStart) / MINUTES_PER_ROW) * 100}%`;

                  return (
                    <td
                      key={day}
                      data-calendar-cell
                      data-day={day}
                      data-display-row={displayRow}
                      onMouseDown={() => startDrag(day, displayRow)}
                      onMouseEnter={() => moveDrag(day, displayRow)}
                      onMouseUp={endDrag}
                      className={`relative cursor-pointer border p-0 ${
                        isDropTarget
                          ? "bg-blue-100 ring-2 ring-inset ring-blue-300"
                          : selecting
                            ? "bg-blue-100"
                            : "hover:bg-blue-50"
                      }`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <div className="absolute inset-0">
                        {eventsStartingInRow.map((event) => {
                          const category = categories.find(
                            (item) => item.id === event.categoryId,
                          );
                          if (!category) return null;

                          const position = getEventPosition(event, rowStart);
                          const isCompact =
                            event.end - event.start <= MINUTES_PER_ROW;
                          const timeLabel = `${formatTime(event.start)}〜${formatTime(event.end)}`;

                          return (
                            <div
                              key={event.id}
                              title={`${category.icon} ${category.name} ${timeLabel}`}
                              aria-grabbed={eventMove?.eventId === event.id}
                              className={`absolute z-10 box-border touch-none overflow-hidden text-white transition-[opacity,transform] duration-150 ${
                                eventMove?.eventId === event.id
                                  ? "cursor-grabbing opacity-35 scale-[0.98]"
                                  : "cursor-grab opacity-100"
                              } ${
                                isCompact
                                  ? "left-1 right-1 rounded px-1 text-[10px] leading-none"
                                  : "left-1 right-1 rounded p-1 text-xs shadow"
                              }`}
                              style={{
                                background: category.color,
                                height: position.height,
                                top: position.top,
                              }}
                              onPointerDown={(pointerEvent) =>
                                startEventMove(event, pointerEvent)
                              }
                              onPointerMove={moveEvent}
                              onPointerUp={(pointerEvent) =>
                                finishEventMove(pointerEvent, true)
                              }
                              onPointerCancel={(pointerEvent) =>
                                finishEventMove(pointerEvent, false)
                              }
                              onMouseDown={(e) => e.stopPropagation()}
                              onMouseUp={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isCompact ? (
                                <div className="truncate pr-5 font-bold leading-[16px]">
                                  {category.icon} {category.name}{" "}
                                  <span className="font-normal opacity-90">
                                    {timeLabel}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <div className="truncate pr-5 font-bold">
                                    {category.icon} {category.name}
                                  </div>
                                  <div className="truncate opacity-80">
                                    {timeLabel}
                                  </div>
                                </>
                              )}
                              <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseUp={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEvent(event.id);
                                }}
                                aria-label={`${category.name}を削除`}
                                className="absolute right-1 top-0 rounded bg-black/20 px-1 text-[10px] leading-[14px]"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                        {showsCurrentTime && (
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute left-0 right-0 z-20 h-0"
                            style={{ top: currentTimeTop }}
                          >
                            <span className="absolute left-0 right-0 top-0 h-px bg-rose-500/80 shadow-[0_0_4px_rgba(244,63,94,0.35)]" />
                            <span className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-rose-500 shadow-sm" />
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {eventMove && movingCalendarEvent && movingCategory && (
        <div
          ref={dragGhostRef}
          className="pointer-events-none fixed z-30 box-border overflow-hidden rounded-md p-1 text-xs text-white opacity-75 shadow-2xl will-change-transform"
          style={{
            background: movingCategory.color,
            height: eventMove.height,
            left: eventMove.left,
            top: eventMove.top,
            width: eventMove.width,
          }}
        >
          <div className="truncate font-bold">
            {movingCategory.icon} {movingCategory.name}
          </div>
          <div className="truncate opacity-90">
            {formatTime(movingCalendarEvent.start)}〜
            {formatTime(movingCalendarEvent.end)}
          </div>
        </div>
      )}

      {saveStatus && (
        <div
          key={saveStatus}
          role="status"
          aria-live="polite"
          className={`fixed right-4 top-4 z-[120] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-sm font-bold text-slate-700 shadow-lg backdrop-blur ${
            saveStatus === "saved" ? "save-toast-lifetime" : "toast-enter"
          }`}
        >
          {saveStatus === "saving" ? "💾 保存中..." : "✅ 保存しました"}
        </div>
      )}

      {undoSnapshot && (
        <div
          key={undoSnapshot.id}
          role="status"
          aria-live="polite"
          className="undo-toast-lifetime fixed bottom-5 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-slate-900/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur"
        >
          <span>操作しました</span>
          <button
            onClick={undoLastOperation}
            className="rounded-lg bg-white/15 px-3 py-1.5 font-bold text-blue-200 transition-colors hover:bg-white/25 active:bg-white/30"
          >
            元に戻す
          </button>
        </div>
      )}

      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-[130] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="mx-auto my-4 min-h-[calc(100dvh-2rem)] max-w-4xl rounded-3xl bg-slate-50 shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  カテゴリ管理
                </h3>
                <p className="text-sm text-slate-500">
                  名前・色・アイコンを自由に変更できます
                </p>
              </div>
              <button
                onClick={() => {
                  setCategoryDraft(null);
                  setIsCategoryManagerOpen(false);
                }}
                aria-label="カテゴリ管理を閉じる"
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-600 transition-colors hover:bg-slate-200"
              >
                ✕
              </button>
            </header>

            <div className="grid gap-5 p-5 md:grid-cols-[1fr_320px]">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">
                    カテゴリ一覧（{categories.length}）
                  </h4>
                  <button
                    onClick={startAddingCategory}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
                  >
                    ＋ 追加
                  </button>
                </div>

                {categories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                    カテゴリがありません。「追加」から作成してください。
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm"
                      >
                        <div
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl text-white"
                          style={{ background: category.color }}
                        >
                          {category.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-800">
                            {category.name}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {category.color}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => startEditingCategory(category)}
                            className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => deleteCategory(category)}
                            className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <aside>
                {categoryDraft ? (
                  <div className="sticky top-24 rounded-2xl border bg-white p-4 shadow-sm">
                    <h4 className="font-bold text-slate-900">
                      {categoryDraft.id
                        ? "カテゴリを編集"
                        : "カテゴリを追加"}
                    </h4>

                    <label className="mt-4 block text-sm font-bold text-slate-700">
                      名前
                    </label>
                    <input
                      value={categoryDraft.name}
                      onChange={(event) =>
                        setCategoryDraft((current) =>
                          current
                            ? { ...current, name: event.target.value }
                            : null,
                        )
                      }
                      placeholder="例：資格勉強"
                      className="mt-1 w-full rounded-xl border p-3 text-slate-900"
                    />

                    <label className="mt-4 block text-sm font-bold text-slate-700">
                      色
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="color"
                        value={categoryDraft.color}
                        onChange={(event) =>
                          setCategoryDraft((current) =>
                            current
                              ? { ...current, color: event.target.value }
                              : null,
                          )
                        }
                        className="h-12 w-16 cursor-pointer rounded-xl border bg-white p-1"
                      />
                      <input
                        value={categoryDraft.color}
                        onChange={(event) =>
                          setCategoryDraft((current) =>
                            current
                              ? { ...current, color: event.target.value }
                              : null,
                          )
                        }
                        className="min-w-0 flex-1 rounded-xl border p-3 font-mono text-slate-900"
                      />
                    </div>

                    <label className="mt-4 block text-sm font-bold text-slate-700">
                      アイコン
                    </label>
                    <input
                      value={categoryDraft.icon}
                      onChange={(event) =>
                        setCategoryDraft((current) =>
                          current
                            ? { ...current, icon: event.target.value }
                            : null,
                        )
                      }
                      placeholder="例：📖"
                      className="mt-1 w-full rounded-xl border p-3 text-xl text-slate-900"
                    />

                    <div className="mt-5 flex gap-2">
                      <button
                        onClick={() => setCategoryDraft(null)}
                        className="flex-1 rounded-xl border py-2.5 font-bold text-slate-600"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={saveCategory}
                        disabled={!categoryDraft.name.trim()}
                        className="flex-1 rounded-xl bg-violet-600 py-2.5 font-bold text-white disabled:opacity-40"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
                    カテゴリを追加するか、一覧から編集を選んでください。
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">予定を追加</h3>
            <p className="mt-1 text-sm text-slate-500">
              {DAYS[draft.day]}曜日 {formatTime(draft.start)}〜{formatTime(draft.end)}
            </p>

            <label className="mt-4 block text-sm font-bold text-slate-700">予定</label>
            <select
              value={activeCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="mt-1 w-full rounded-xl border p-3 text-slate-900"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>

            {categories.length === 0 && (
              <p className="mt-2 text-sm text-red-600">
                先にカテゴリ管理からカテゴリを追加してください。
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button onClick={() => setDraft(null)} className="flex-1 rounded-xl border py-3 font-bold text-slate-700">
                キャンセル
              </button>
              <button
                onClick={addEvent}
                disabled={categories.length === 0}
                className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-40"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

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

type Draft = {
  day: number;
  start: number;
  end: number;
};

type ViewMode = "detail" | "overview";

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
const STORAGE_VERSION = 4;
const MINUTES_PER_ROW = 30;
const DETAIL_ROW_HEIGHT = 32;
const CLEANING_CATEGORY: Category = {
  id: "cleaning",
  name: "掃除",
  color: "#d6a06a",
  icon: "🧹",
};

const OVERVIEW_LABELS: Record<string, string> = {
  "takken-law": "宅建",
  rights: "権利",
  regulations: "法令",
  "meal-prep": "作り置き",
  youtube: "YouTube",
  bath: "風呂",
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

function toMinutes(hour: number, minute = 0) {
  return hour * 60 + minute;
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
  const element = document.elementFromPoint(clientX, clientY);
  const cell = element?.closest<HTMLElement>("[data-calendar-cell]");
  if (!cell) return null;

  const day = Number(cell.dataset.day);
  const row = Number(cell.dataset.row);
  if (!Number.isInteger(day) || !Number.isInteger(row)) return null;

  const rect = cell.getBoundingClientRect();
  const positionInRow = Math.max(
    0,
    Math.min(1, (clientY - rect.top) / rect.height),
  );
  const minuteInRow = Math.min(
    25,
    Math.round((positionInRow * MINUTES_PER_ROW) / 5) * 5,
  );

  return {
    day,
    row,
    pointerMinute: row * MINUTES_PER_ROW + minuteInRow,
  };
}

export default function WeeklyCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("detail");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] =
    useState<Category[]>(DEFAULT_CATEGORIES);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);

  const [dragStart, setDragStart] = useState<{ day: number; row: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ day: number; row: number } | null>(null);
  const [eventMove, setEventMove] = useState<EventMove | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
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
  const isOverview = viewMode === "overview";
  const rowHeight = isOverview
    ? "var(--overview-row-height)"
    : DETAIL_ROW_HEIGHT;
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
      } catch (error) {
        console.error("予定データの復元に失敗しました。", error);
      } finally {
        setHasLoadedEvents(true);
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
    return () => {
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
      }
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

  function startDrag(day: number, row: number) {
    setDragStart({ day, row });
    setDragCurrent({ day, row });
  }

  function moveDrag(day: number, row: number) {
    if (!dragStart || dragStart.day !== day) return;
    setDragCurrent({ day, row });
  }

  function endDrag() {
    if (!dragStart || !dragCurrent) return;
    const start = Math.min(dragStart.row, dragCurrent.row) * MINUTES_PER_ROW;
    const end = (Math.max(dragStart.row, dragCurrent.row) + 1) * MINUTES_PER_ROW;
    setDraft({ day: dragStart.day, start, end });
    setDragStart(null);
    setDragCurrent(null);
  }

  function isSelecting(day: number, row: number) {
    if (!dragStart || !dragCurrent || dragStart.day !== day) return false;
    const start = Math.min(dragStart.row, dragCurrent.row);
    const end = Math.max(dragStart.row, dragCurrent.row);
    return row >= start && row <= end;
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

  function applyFixedTemplate(secondDayOff: 1 | 3) {
    clearUndo();
    const workDays = DAYS.map((_, day) => day).filter(
      (day) => day !== 2 && day !== secondDayOff,
    );
    const templateEvents: CalendarEvent[] = [];

    function addTemplateEvent(
      categoryId: string,
      day: number,
      start: number,
      end: number,
    ) {
      templateEvents.push({
        id: crypto.randomUUID(),
        categoryId,
        day,
        start,
        end,
        weekOffset,
        source: "fixed-template",
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
      addTemplateEvent("meal", day, toMinutes(19, 30), toMinutes(19, 45));
      addTemplateEvent("bath", day, toMinutes(19, 45), toMinutes(20, 10));
    });

    const requiredCategoryIds = new Set(
      templateEvents.map((event) => event.categoryId),
    );
    const missingCategories = DEFAULT_CATEGORIES.filter(
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
      return mergeUniqueEvents(withoutCurrentTemplate, templateEvents);
    });
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
    <div className="weekly-calendar" data-calendar-view={viewMode}>
      <div
        className={`rounded-xl bg-white ${
          isOverview ? "mb-2 p-2 shadow-sm" : "mb-4 p-4 shadow"
        }`}
      >
        <div
          className={`flex md:flex-row md:items-center md:justify-between ${
            isOverview ? "flex-row flex-wrap gap-2" : "flex-col gap-3"
          }`}
        >
          <div>
            <h2
              className={`font-bold text-slate-900 ${
                isOverview ? "text-base" : "text-xl"
              }`}
            >
              週間スケジュール
            </h2>
            <p className={isOverview ? "text-xs text-slate-500" : "text-sm text-slate-500"}>
              {dateLabel(weekDates[0])}〜{dateLabel(weekDates[6])}
            </p>
            <div
              className={`inline-flex rounded-lg bg-slate-100 p-1 ${
                isOverview ? "mt-1" : "mt-2"
              }`}
            >
              <button
                onClick={() => setViewMode("detail")}
                aria-pressed={!isOverview}
                className={`rounded-md font-bold ${
                  isOverview ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
                } ${
                  !isOverview
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                詳細表示
              </button>
              <button
                onClick={() => setViewMode("overview")}
                aria-pressed={isOverview}
                className={`rounded-md font-bold ${
                  isOverview ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
                } ${
                  isOverview
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                全体表示
              </button>
            </div>
          </div>

          <div className={`flex flex-wrap ${isOverview ? "gap-1" : "gap-2"}`}>
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className={`rounded-xl border font-bold text-slate-700 ${
                isOverview ? "px-2 py-1 text-xs" : "px-4 py-2"
              }`}
            >
              ← 前週
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`rounded-xl bg-slate-900 font-bold text-white ${
                isOverview ? "px-2 py-1 text-xs" : "px-4 py-2"
              }`}
            >
              今週
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className={`rounded-xl border font-bold text-slate-700 ${
                isOverview ? "px-2 py-1 text-xs" : "px-4 py-2"
              }`}
            >
              次週 →
            </button>
            {!isOverview && (
              <>
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
              </>
            )}
          </div>
        </div>
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
                  className={`min-w-[140px] border bg-gray-900 text-white ${
                    isOverview ? "h-8 text-sm" : "h-14"
                  }`}
                >
                  <div>{day}</div>
                  <div className="text-xs text-slate-300">{dateLabel(weekDates[i])}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: 48 }).map((_, row) => (
              <tr key={row} style={{ height: rowHeight }}>
                <td
                  className={`border bg-gray-100 text-gray-700 ${
                    isOverview
                      ? "p-0 text-center text-[8px]"
                      : "p-1 text-xs"
                  }`}
                  style={{
                    height: rowHeight,
                    lineHeight: isOverview ? rowHeight : undefined,
                  }}
                >
                  {!isOverview || row % 2 === 0
                    ? formatTime(row * MINUTES_PER_ROW)
                    : ""}
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
                  const selecting = isSelecting(day, row);
                  const isDropTarget =
                    dropTarget?.day === day && dropTarget.row === row;

                  return (
                    <td
                      key={day}
                      data-calendar-cell
                      data-day={day}
                      data-row={row}
                      onMouseDown={() => startDrag(day, row)}
                      onMouseEnter={() => moveDrag(day, row)}
                      onMouseUp={endDrag}
                      className={`relative cursor-pointer border p-0 ${
                        isDropTarget
                          ? "bg-blue-100 ring-2 ring-inset ring-blue-300"
                          : selecting
                            ? "bg-blue-100"
                            : "hover:bg-blue-50"
                      }`}
                      style={{ height: rowHeight }}
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
                          const overviewLabel =
                            OVERVIEW_LABELS[category.id] ?? category.name;

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
                                isOverview
                                  ? "left-[2px] right-[2px] rounded-[2px] px-0.5 text-[9px] leading-[8px] ring-1 ring-inset ring-white/40"
                                  : isCompact
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
                              {isOverview ? (
                                <div className="truncate font-bold">
                                  {category.icon} {overviewLabel}
                                </div>
                              ) : isCompact ? (
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
                              {!isOverview && (
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
                              )}
                            </div>
                          );
                        })}
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
            {movingCategory.icon}{" "}
            {isOverview
              ? OVERVIEW_LABELS[movingCategory.id] ?? movingCategory.name
              : movingCategory.name}
          </div>
          {!isOverview && (
            <div className="truncate opacity-90">
              {formatTime(movingCalendarEvent.start)}〜
              {formatTime(movingCalendarEvent.end)}
            </div>
          )}
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
  );
}

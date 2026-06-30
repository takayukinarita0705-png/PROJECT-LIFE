"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import CalendarGrid from "./CalendarGrid";
import CategoryDialog from "./CategoryDialog";
import EventDialog, { MobileWeekEventDialog } from "./EventDialog";
import MobileSchedule from "./MobileSchedule";
import WeekToolbar from "./WeekToolbar";
import {
  DAYS,
  DEFAULT_CATEGORIES,
  attachRoutineRelations,
  createFixedTemplateEvents,
  dateLabel,
  eventKey,
  getDropTarget,
  getWeekDates,
  mergeUniqueEvents,
  updateRoutineManually,
  updateWorkWithRelatedRoutine,
} from "@/app/lib/calendar";
import {
  MINUTES_PER_ROW,
  displayRowToTimeRow,
  formatTime,
  minutesFromDisplayStart,
  parseTime,
} from "@/app/lib/time";
import {
  loadSharedCalendarState,
  saveSharedCalendarState,
} from "@/app/lib/supabaseStorage";
import { CURRENT_SCHEMA_VERSION } from "@/app/lib/migrations/calendarState";
import type {
  CalendarEvent,
  CalendarTemplate,
  Category,
  CategoryDraft,
  Draft,
  DropTarget,
  EventMove,
  EventEditDraft,
  SaveStatus,
  TemplateEvent,
  UndoSnapshot,
} from "@/app/types/calendar";

export default function WeeklyCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [mobileView, setMobileView] = useState<"today" | "week">("today");
  const [mobileDayOffset, setMobileDayOffset] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] =
    useState<Category[]>(DEFAULT_CATEGORIES);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const [templates, setTemplates] = useState<CalendarTemplate[]>([]);
  const [hasLoadedTemplates, setHasLoadedTemplates] = useState(false);
  const [canPersistSharedState, setCanPersistSharedState] = useState(false);
  const [dragStart, setDragStart] = useState<{
    day: number;
    weekOffset: number;
    row: number;
  } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{
    day: number;
    weekOffset: number;
    row: number;
  } | null>(null);
  const [eventMove, setEventMove] = useState<EventMove | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mobileWeekEditDraft, setMobileWeekEditDraft] =
    useState<EventEditDraft | null>(null);
  const [mobileWeekEditError, setMobileWeekEditError] = useState("");
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
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const weekDates = getWeekDates(weekOffset);
  const visibleEvents = hasLoadedEvents
    ? events.filter((event) => event.weekOffset === weekOffset)
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
  const mobileDayColumns = Array.from({ length: 3 }, (_, columnIndex) => {
    const absoluteDay =
      (currentDay ?? 0) + mobileDayOffset + columnIndex;
    const columnWeekOffset = Math.floor(absoluteDay / DAYS.length);
    const day =
      ((absoluteDay % DAYS.length) + DAYS.length) % DAYS.length;

    return {
      day,
      weekOffset: columnWeekOffset,
      date: getWeekDates(columnWeekOffset)[day],
    };
  });
  const mobileVisibleEvents = hasLoadedEvents
    ? events.filter((event) =>
        mobileDayColumns.some(
          (column) =>
            column.day === event.day &&
            column.weekOffset === event.weekOffset,
        ),
      )
    : [];
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
  useEffect(() => {
    let cancelled = false;

    async function restoreSharedState() {
      try {
        const sharedState = await loadSharedCalendarState();
        if (cancelled) return;

        setCategories(sharedState.categories);
        setEvents(sharedState.events);
        setTemplates(sharedState.templates);
        setCanPersistSharedState(true);
      } catch (error) {
        console.error("Supabaseから予定データを復元できませんでした。", error);
      } finally {
        if (cancelled) return;
        setHasLoadedEvents(true);
        setHasLoadedTemplates(true);
      }
    }

    void restoreSharedState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !hasLoadedEvents ||
      !hasLoadedTemplates ||
      !canPersistSharedState
    ) {
      return;
    }

    let cancelled = false;
    let hideTimer: number | undefined;
    const persistTimer = window.setTimeout(() => {
      setSaveStatus("saving");

      const sharedState = {
        version: 1,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        categories,
        events,
        templates,
      } as const;
      const saveRequest = saveQueueRef.current.then(
        () => saveSharedCalendarState(sharedState),
        () => saveSharedCalendarState(sharedState),
      );
      saveQueueRef.current = saveRequest.catch(() => undefined);

      void saveRequest
        .then(() => {
          if (cancelled) return;
          setSaveStatus("saved");
          hideTimer = window.setTimeout(() => setSaveStatus(null), 2000);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setSaveStatus(null);
          console.error("Supabaseへ予定データを保存できませんでした。", error);
        });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(persistTimer);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, [
    canPersistSharedState,
    categories,
    events,
    hasLoadedEvents,
    hasLoadedTemplates,
    templates,
  ]);

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

  function startDrag(
    day: number,
    displayRow: number,
    targetWeekOffset: number,
  ) {
    setDragStart({ day, weekOffset: targetWeekOffset, row: displayRow });
    setDragCurrent({ day, weekOffset: targetWeekOffset, row: displayRow });
  }

  function moveDrag(
    day: number,
    displayRow: number,
    targetWeekOffset: number,
  ) {
    if (
      !dragStart ||
      dragStart.day !== day ||
      dragStart.weekOffset !== targetWeekOffset
    ) {
      return;
    }
    setDragCurrent({ day, weekOffset: targetWeekOffset, row: displayRow });
  }

  function endDrag() {
    if (!dragStart || !dragCurrent) return;
    const firstDisplayRow = Math.min(dragStart.row, dragCurrent.row);
    const lastDisplayRow = Math.max(dragStart.row, dragCurrent.row);
    const start = displayRowToTimeRow(firstDisplayRow) * MINUTES_PER_ROW;
    const end =
      (displayRowToTimeRow(lastDisplayRow) + 1) * MINUTES_PER_ROW;
    if (end > start) {
      setDraft({
        day: dragStart.day,
        weekOffset: dragStart.weekOffset,
        start,
        end,
      });
    }
    setDragStart(null);
    setDragCurrent(null);
  }

  function isSelecting(
    day: number,
    displayRow: number,
    targetWeekOffset: number,
  ) {
    if (
      !dragStart ||
      !dragCurrent ||
      dragStart.day !== day ||
      dragStart.weekOffset !== targetWeekOffset
    ) {
      return false;
    }
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
        current?.weekOffset === target?.weekOffset &&
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

    const target =
      shouldMove && eventMoveDidMoveRef.current
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
          weekOffset: target.weekOffset,
          start,
          end: start + duration,
        };
        const isDuplicate = events.some(
          (item) =>
            item.id !== event.id && eventKey(item) === eventKey(movedEvent),
        );

        if (
          !isDuplicate &&
          (event.day !== movedEvent.day ||
            event.weekOffset !== movedEvent.weekOffset ||
            event.start !== movedEvent.start)
        ) {
          showUndo(events);
          if (event.categoryId === "work") {
            setEvents(
              updateWorkWithRelatedRoutine(events, event, movedEvent),
            );
          } else if (event.routineRelation) {
            setEvents(updateRoutineManually(events, event, movedEvent));
          } else {
            setEvents(
              events.map((item) =>
                item.id === event.id ? movedEvent : item,
              ),
            );
          }
        }
      }
    }

    setEventMove(null);
    setDropTarget(null);
    eventMoveDidMoveRef.current = false;
  }

  function addEvent() {
    if (!draft || !activeCategoryId) return;

    const nextEvents = mergeUniqueEvents(events, [
      {
        id: crypto.randomUUID(),
        categoryId: activeCategoryId,
        mode: "fixed",
        status: "pending",
        linkType: "none",
        offsetMinutes: 0,
        day: draft.day,
        start: draft.start,
        end: draft.end,
        weekOffset: draft.weekOffset,
      },
    ]);

    if (nextEvents.length !== events.length) {
      showUndo(events);
      setEvents(attachRoutineRelations(nextEvents));
    }
    setDraft(null);
  }

  function deleteEvent(id: string) {
    const deletedEvent = events.find((event) => event.id === id);
    let nextEvents = events.filter((event) => event.id !== id);
    if (deletedEvent?.routineRelation) {
      nextEvents = nextEvents.map((event) =>
        event.categoryId === "work" &&
        event.weekOffset === deletedEvent.weekOffset &&
        event.day === deletedEvent.day
          ? { ...event, routineDetached: true }
          : event,
      );
    }
    if (nextEvents.length !== events.length) {
      showUndo(events);
      setEvents(nextEvents);
    }
    setDragStart(null);
    setDragCurrent(null);
    setDraft(null);
  }

  function openMobileWeekEditor(event: CalendarEvent) {
    const category = categories.find(
      (item) => item.id === event.categoryId,
    );
    setMobileWeekEditError("");
    setMobileWeekEditDraft({
      eventId: event.id,
      title: event.title?.trim() || category?.name || "",
      categoryId: event.categoryId,
      start: formatTime(event.start),
      end: formatTime(event.end),
    });
  }

  function saveMobileWeekEdit() {
    if (!mobileWeekEditDraft) return;

    const start = parseTime(mobileWeekEditDraft.start);
    const end = parseTime(mobileWeekEditDraft.end);
    const title = mobileWeekEditDraft.title.trim();
    if (!title) {
      setMobileWeekEditError("タイトルを入力してください。");
      return;
    }
    if (start === null || end === null || end <= start) {
      setMobileWeekEditError(
        "開始・終了時刻を HH:MM 形式で正しく入力してください。",
      );
      return;
    }

    const event = events.find(
      (item) => item.id === mobileWeekEditDraft.eventId,
    );
    if (!event) {
      setMobileWeekEditDraft(null);
      return;
    }

    const editedEvent: CalendarEvent = {
      ...event,
      title,
      categoryId: mobileWeekEditDraft.categoryId,
      start,
      end,
    };
    const isDuplicate = events.some(
      (item) =>
        item.id !== event.id && eventKey(item) === eventKey(editedEvent),
    );
    if (isDuplicate) {
      setMobileWeekEditError("同じ時間に同じ予定がすでにあります。");
      return;
    }

    showUndo(events);
    if (
      event.categoryId === "work" &&
      editedEvent.categoryId === "work" &&
      event.end !== editedEvent.end
    ) {
      setEvents(updateWorkWithRelatedRoutine(events, event, editedEvent));
    } else if (event.routineRelation) {
      setEvents(updateRoutineManually(events, event, editedEvent));
    } else {
      setEvents(
        events.map((item) =>
          item.id === event.id ? editedEvent : item,
        ),
      );
    }
    setMobileWeekEditDraft(null);
    setMobileWeekEditError("");
  }

  function deleteMobileWeekEvent() {
    if (!mobileWeekEditDraft) return;
    deleteEvent(mobileWeekEditDraft.eventId);
    setMobileWeekEditDraft(null);
    setMobileWeekEditError("");
  }

  function createNextWeek() {
    clearUndo();
    const thisWeekEvents = events.filter(
      (event) => event.weekOffset === weekOffset,
    );
    let copied: CalendarEvent[] = thisWeekEvents.map((event) => ({
      ...event,
      id: crypto.randomUUID(),
      weekOffset: weekOffset + 1,
      status: "pending",
      linkedToEventId: undefined,
      linkType: "none",
      offsetMinutes: 0,
      routineDetached: undefined,
    }));
    copied
      .filter((event) => event.categoryId === "work")
      .forEach((workEvent) => {
        copied = updateWorkWithRelatedRoutine(
          copied,
          workEvent,
          workEvent,
        );
      });

    setEvents((previous) => mergeUniqueEvents(previous, copied));
    setWeekOffset((previous) => previous + 1);
  }

  function applyTemplate(
    templateEvents: TemplateEvent[],
    templateCategories: Category[],
  ) {
    clearUndo();
    const nextEvents = attachRoutineRelations(
      templateEvents.map<CalendarEvent>((event) => ({
        ...event,
        id: crypto.randomUUID(),
        weekOffset,
        status: "pending",
        linkType: "none",
        offsetMinutes: 0,
        source: "fixed-template",
      })),
    );

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

    setEvents((previous) => {
      const withoutCurrentTemplate = previous.filter(
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
    const enteredName = window.prompt(
      "テンプレート名を入力してください",
      suggestedName,
    );
    const name = enteredName?.trim();
    if (!name) return;

    const templateEvents = currentWeekEvents.map<TemplateEvent>((event) => ({
      title: event.title,
      categoryId: event.categoryId,
      mode: event.mode,
      day: event.day,
      start: event.start,
      end: event.end,
      routineRelation: event.routineRelation,
    }));
    const requiredCategoryIds = new Set(
      templateEvents.map((event) => event.categoryId),
    );
    const templateCategories = categories
      .filter((category) => requiredCategoryIds.has(category.id))
      .map((category) => ({ ...category }));
    const createdAt = new Date().toISOString();

    setTemplates((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        description: "",
        events: templateEvents,
        categories: templateCategories,
        createdAt,
        updatedAt: createdAt,
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
    setCategoryDraft({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
    });
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
                updatedAt: new Date().toISOString(),
              }
            : category,
        ),
      );
    } else {
      const createdAt = new Date().toISOString();
      const category: Category = {
        id: `custom-${crypto.randomUUID()}`,
        name,
        color: categoryDraft.color,
        icon,
        group: "other",
        createdAt,
        updatedAt: createdAt,
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
      <div className="md:hidden">
        <div className="mb-4 inline-flex rounded-xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setMobileView("today")}
            aria-pressed={mobileView === "today"}
            className={`min-h-11 rounded-lg px-4 py-2 text-sm font-bold ${
              mobileView === "today"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            今日表示
          </button>
          <button
            type="button"
            onClick={() => setMobileView("week")}
            aria-pressed={mobileView === "week"}
            className={`min-h-11 rounded-lg px-4 py-2 text-sm font-bold ${
              mobileView === "week"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            週間表示
          </button>
        </div>

        {mobileView === "today" ? (
          <MobileSchedule
            currentTime={currentTime}
            currentDay={currentDay}
            hasLoadedEvents={hasLoadedEvents}
            todaySchedule={todaySchedule}
          />
        ) : (
          <section>
            <header className="mb-3">
              <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
                WEEK
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                週間スケジュール
              </h2>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMobileDayOffset((value) => value - 3)
                  }
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm"
                >
                  ← 前へ
                </button>
                <p className="text-center text-sm font-medium text-slate-500">
                  {dateLabel(mobileDayColumns[0].date)}〜
                  {dateLabel(mobileDayColumns[2].date)}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setMobileDayOffset((value) => value + 3)
                  }
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm"
                >
                  次へ →
                </button>
              </div>
            </header>
            <CalendarGrid
              weekDates={weekDates}
              visibleEvents={mobileVisibleEvents}
              categories={categories}
              dropTarget={dropTarget}
              eventMove={eventMove}
              weekOffset={weekOffset}
              currentDay={currentDay}
              currentMinutes={currentMinutes}
              isSelecting={isSelecting}
              onSelectionStart={startDrag}
              onSelectionMove={moveDrag}
              onSelectionEnd={endDrag}
              onSelectionCancel={() => {
                setDragStart(null);
                setDragCurrent(null);
              }}
              onEventPointerDown={startEventMove}
              onEventPointerMove={moveEvent}
              onEventPointerUp={(pointerEvent) =>
                finishEventMove(pointerEvent, true)
              }
              onEventPointerCancel={(pointerEvent) =>
                finishEventMove(pointerEvent, false)
              }
              onDeleteEvent={deleteEvent}
              onEditEvent={openMobileWeekEditor}
              dayColumns={mobileDayColumns}
              compactColumns
            />
          </section>
        )}
      </div>

      {mobileWeekEditDraft && (
        <MobileWeekEventDialog
          draft={mobileWeekEditDraft}
          categories={categories}
          error={mobileWeekEditError}
          onChange={setMobileWeekEditDraft}
          onCancel={() => {
            setMobileWeekEditDraft(null);
            setMobileWeekEditError("");
          }}
          onDelete={deleteMobileWeekEvent}
          onSave={saveMobileWeekEdit}
        />
      )}

      <div className="hidden md:block">
        <WeekToolbar
          weekDates={weekDates}
          templates={templates}
          hasLoadedEvents={hasLoadedEvents}
          hasLoadedTemplates={hasLoadedTemplates}
          onPreviousWeek={() => setWeekOffset((value) => value - 1)}
          onCurrentWeek={() => setWeekOffset(0)}
          onNextWeek={() => setWeekOffset((value) => value + 1)}
          onOpenCategoryManager={() => {
            setCategoryDraft(null);
            setIsCategoryManagerOpen(true);
          }}
          onCreateNextWeek={createNextWeek}
          onApplyFixedTemplate={applyFixedTemplate}
          onSaveCurrentWeekTemplate={saveCurrentWeekAsTemplate}
          onApplyTemplate={(template) =>
            applyTemplate(template.events, template.categories)
          }
          onDeleteTemplate={deleteTemplate}
        />

        <CalendarGrid
          weekDates={weekDates}
          visibleEvents={visibleEvents}
          categories={categories}
          dropTarget={dropTarget}
          eventMove={eventMove}
          weekOffset={weekOffset}
          currentDay={currentDay}
          currentMinutes={currentMinutes}
          isSelecting={isSelecting}
          onSelectionStart={startDrag}
          onSelectionMove={moveDrag}
          onSelectionEnd={endDrag}
          onSelectionCancel={() => {
            setDragStart(null);
            setDragCurrent(null);
          }}
          onEventPointerDown={startEventMove}
          onEventPointerMove={moveEvent}
          onEventPointerUp={(pointerEvent) =>
            finishEventMove(pointerEvent, true)
          }
          onEventPointerCancel={(pointerEvent) =>
            finishEventMove(pointerEvent, false)
          }
          onDeleteEvent={deleteEvent}
        />

        {isCategoryManagerOpen && (
          <CategoryDialog
            categories={categories}
            draft={categoryDraft}
            onDraftChange={setCategoryDraft}
            onClose={() => {
              setCategoryDraft(null);
              setIsCategoryManagerOpen(false);
            }}
            onAdd={startAddingCategory}
            onEdit={startEditingCategory}
            onDelete={deleteCategory}
            onSave={saveCategory}
          />
        )}
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
            {movingCalendarEvent.title?.trim() || movingCategory.name}
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
            saveStatus === "saved"
              ? "save-toast-lifetime"
              : "toast-enter"
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
            className="min-h-11 rounded-lg bg-white/15 px-3 py-1.5 font-bold text-blue-200 transition-colors hover:bg-white/25 active:bg-white/30 md:min-h-0"
          >
            元に戻す
          </button>
        </div>
      )}

      {draft && (
        <EventDialog
          draft={draft}
          categories={categories}
          activeCategoryId={activeCategoryId}
          onCategoryChange={setSelectedCategoryId}
          onCancel={() => setDraft(null)}
          onAdd={addEvent}
        />
      )}
    </div>
  );
}

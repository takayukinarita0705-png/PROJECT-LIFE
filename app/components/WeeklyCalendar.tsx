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
  dateLabel,
  getDropTarget,
  getWeekDates,
} from "@/app/lib/calendar";
import {
  formatCalendarDate,
  getCalendarDateForWeekDay,
} from "@/app/lib/date";
import {
  MINUTES_PER_ROW,
  displayRowToTimeRow,
  formatTime,
  minutesFromDisplayStart,
} from "@/app/lib/time";
import useCalendarController from "@/app/hooks/useCalendarController";
import type {
  CalendarEvent,
  Draft,
  DropTarget,
  EventMove,
  EventEditDraft,
} from "@/app/types/calendar";

export default function WeeklyCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const {
    activeCategoryId,
    addEvent: addCalendarEvent,
    applyFixedTemplate,
    applyTemplate,
    categories,
    categoryDraft,
    createNextWeek,
    deleteCategory,
    deleteEvent: deleteCalendarEvent,
    deleteTemplate,
    events,
    hasLoadedEvents,
    hasLoadedTemplates,
    moveEvent: moveCalendarEvent,
    saveCategory,
    saveCurrentWeekAsTemplate,
    saveEventEdit,
    saveStatus,
    setCategoryDraft,
    setSelectedCategoryId,
    startAddingCategory,
    startEditingCategory,
    templates,
    undoLastOperation,
    undoSnapshot,
  } = useCalendarController(weekOffset);
  const [mobileView, setMobileView] = useState<"today" | "week">("today");
  const [mobileDayOffset, setMobileDayOffset] = useState(0);
  const [dragStart, setDragStart] = useState<{
    date: string;
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
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mobileWeekEditDraft, setMobileWeekEditDraft] =
    useState<EventEditDraft | null>(null);
  const [mobileWeekEditError, setMobileWeekEditError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const dragGhostRef = useRef<HTMLDivElement>(null);
  const eventMoveDidMoveRef = useRef(false);

  const weekDates = getWeekDates(weekOffset);
  const weekDateKeys = new Set(weekDates.map(formatCalendarDate));
  const visibleEvents = hasLoadedEvents
    ? events.filter((event) => weekDateKeys.has(event.date))
    : [];
  const movingCalendarEvent = eventMove
    ? events.find((event) => event.id === eventMove.eventId) ?? null
    : null;
  const movingCategory = movingCalendarEvent
    ? categories.find(
        (category) => category.id === movingCalendarEvent.categoryId,
      ) ?? null
    : null;
  const currentDay =
    currentTime === null ? null : (currentTime.getDay() + 6) % DAYS.length;
  const currentDate =
    currentTime === null ? null : formatCalendarDate(currentTime);
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
            formatCalendarDate(column.date) === event.date,
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
    currentDate === null || !hasLoadedEvents
      ? []
      : events
          .filter((event) => event.date === currentDate)
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

  function startDrag(
    day: number,
    displayRow: number,
    targetWeekOffset: number,
  ) {
    setDragStart({
      date: getCalendarDateForWeekDay(targetWeekOffset, day),
      day,
      weekOffset: targetWeekOffset,
      row: displayRow,
    });
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
        date: dragStart.date,
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
        current?.date === target?.date &&
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
          date: target.date,
          day: target.day,
          weekOffset: target.weekOffset,
          start,
          end: start + duration,
        };
        moveCalendarEvent(event, movedEvent);
      }
    }

    setEventMove(null);
    setDropTarget(null);
    eventMoveDidMoveRef.current = false;
  }

  function addEvent() {
    if (!draft) return;
    addCalendarEvent(draft);
    setDraft(null);
  }

  function deleteEvent(id: string) {
    deleteCalendarEvent(id);
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
    const error = saveEventEdit(mobileWeekEditDraft);
    if (error) {
      setMobileWeekEditError(error);
      return;
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

  function handleCreateNextWeek() {
    createNextWeek();
    setWeekOffset((previous) => previous + 1);
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
              currentDate={currentDate}
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
          onCreateNextWeek={handleCreateNextWeek}
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
          currentDate={currentDate}
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

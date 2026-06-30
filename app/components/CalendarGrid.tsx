import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import EventCard from "./EventCard";
import { DAYS, dateLabel } from "@/app/lib/calendar";
import {
  DISPLAY_ROWS,
  MINUTES_PER_ROW,
  ROW_HEIGHT,
  formatTime,
} from "@/app/lib/time";
import type {
  CalendarEvent,
  Category,
  DropTarget,
  EventMove,
} from "@/app/types/calendar";

type CalendarGridProps = {
  weekDates: Date[];
  visibleEvents: CalendarEvent[];
  categories: Category[];
  dropTarget: DropTarget | null;
  eventMove: EventMove | null;
  weekOffset: number;
  currentDay: number | null;
  currentMinutes: number | null;
  isSelecting: (day: number, displayRow: number) => boolean;
  onSelectionStart: (day: number, displayRow: number) => void;
  onSelectionMove: (day: number, displayRow: number) => void;
  onSelectionEnd: () => void;
  onSelectionCancel: () => void;
  onEventPointerDown: (
    event: CalendarEvent,
    pointerEvent: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  onEventPointerMove: (
    pointerEvent: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  onEventPointerUp: (
    pointerEvent: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  onEventPointerCancel: (
    pointerEvent: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  onDeleteEvent: (id: string) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  dayIndices?: number[];
  compactColumns?: boolean;
  readOnly?: boolean;
};

type TouchGesture = {
  pointerId: number;
  startDay: number;
  startDisplayRow: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  mode: "pending" | "selecting" | "scrolling";
};

export default function CalendarGrid({
  weekDates,
  visibleEvents,
  categories,
  dropTarget,
  eventMove,
  weekOffset,
  currentDay,
  currentMinutes,
  isSelecting,
  onSelectionStart,
  onSelectionMove,
  onSelectionEnd,
  onSelectionCancel,
  onEventPointerDown,
  onEventPointerMove,
  onEventPointerUp,
  onEventPointerCancel,
  onDeleteEvent,
  onEditEvent,
  dayIndices,
  compactColumns = false,
  readOnly = false,
}: CalendarGridProps) {
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const touchGestureRef = useRef<TouchGesture | null>(null);
  const displayedDayIndices =
    dayIndices ?? DAYS.map((_, dayIndex) => dayIndex);

  function moveTouchGesture(
    pointerEvent: ReactPointerEvent<HTMLDivElement>,
  ) {
    const gesture = touchGestureRef.current;
    if (readOnly || gesture?.pointerId !== pointerEvent.pointerId) return;

    pointerEvent.preventDefault();
    const deltaX = pointerEvent.clientX - gesture.startX;
    const deltaY = pointerEvent.clientY - gesture.startY;

    if (
      gesture.mode === "pending" &&
      Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 6
    ) {
      gesture.mode =
        Math.abs(deltaX) > Math.abs(deltaY) ? "scrolling" : "selecting";
      if (gesture.mode === "scrolling") {
        onSelectionCancel();
      }
    }

    if (gesture.mode === "scrolling") {
      pointerEvent.currentTarget.scrollLeft =
        gesture.startScrollLeft - deltaX;
      return;
    }
    if (gesture.mode !== "selecting") return;

    const target = document.elementFromPoint(
      pointerEvent.clientX,
      pointerEvent.clientY,
    );
    const cell = target?.closest<HTMLElement>("[data-calendar-cell]");
    if (!cell || !pointerEvent.currentTarget.contains(cell)) return;

    const day = Number(cell.dataset.day);
    const displayRow = Number(cell.dataset.displayRow);
    if (!Number.isInteger(day) || !Number.isInteger(displayRow)) return;
    onSelectionMove(day, displayRow);
  }

  function finishTouchGesture(
    pointerEvent: ReactPointerEvent<HTMLDivElement>,
    shouldAdd: boolean,
  ) {
    const gesture = touchGestureRef.current;
    if (gesture?.pointerId !== pointerEvent.pointerId) return;

    touchGestureRef.current = null;
    if (!shouldAdd || gesture.mode === "scrolling") {
      onSelectionCancel();
    } else {
      onSelectionEnd();
    }
  }

  return (
    <div
      ref={gridScrollRef}
      className="overflow-auto overscroll-x-contain rounded-xl border border-gray-700 bg-white select-none"
      onMouseLeave={onSelectionCancel}
      onPointerMove={moveTouchGesture}
      onPointerUp={(pointerEvent) =>
        finishTouchGesture(pointerEvent, true)
      }
      onPointerCancel={(pointerEvent) =>
        finishTouchGesture(pointerEvent, false)
      }
    >
      <table
        className={`border-collapse ${
          compactColumns ? "w-full table-fixed" : "min-w-full"
        }`}
      >
        {compactColumns && (
          <colgroup>
            <col className="w-12" />
            {displayedDayIndices.map((dayIndex) => (
              <col key={dayIndex} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            <th
              className={`border bg-gray-900 text-white ${
                compactColumns
                  ? "w-12 px-0.5 text-xs"
                  : "w-20"
              }`}
            >
              時間
            </th>
            {displayedDayIndices.map((dayIndex) => (
              <th
                key={dayIndex}
                className={`h-14 border bg-gray-900 text-white ${
                  compactColumns
                    ? "min-w-0 px-1"
                    : "min-w-[140px]"
                }`}
              >
                <div>{DAYS[dayIndex]}</div>
                <div className="text-xs text-slate-300">
                  {dateLabel(weekDates[dayIndex])}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {DISPLAY_ROWS.map((row, displayRow) => (
            <tr key={row} style={{ height: ROW_HEIGHT }}>
              <td
                className={`border bg-gray-100 text-gray-700 ${
                  compactColumns
                    ? "p-0.5 text-[10px]"
                    : "p-1 text-xs"
                }`}
                style={{ height: ROW_HEIGHT }}
              >
                {formatTime(row * MINUTES_PER_ROW)}
              </td>

              {displayedDayIndices.map((day) => {
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
                    onMouseDown={
                      readOnly
                        ? undefined
                        : () => onSelectionStart(day, displayRow)
                    }
                    onMouseEnter={
                      readOnly
                        ? undefined
                        : () => onSelectionMove(day, displayRow)
                    }
                    onMouseUp={readOnly ? undefined : onSelectionEnd}
                    onPointerDown={(pointerEvent) => {
                      if (
                        readOnly ||
                        pointerEvent.pointerType === "mouse"
                      ) {
                        return;
                      }

                      pointerEvent.preventDefault();
                      touchGestureRef.current = {
                        pointerId: pointerEvent.pointerId,
                        startDay: day,
                        startDisplayRow: displayRow,
                        startX: pointerEvent.clientX,
                        startY: pointerEvent.clientY,
                        startScrollLeft:
                          gridScrollRef.current?.scrollLeft ?? 0,
                        mode: "pending",
                      };
                      pointerEvent.currentTarget.setPointerCapture(
                        pointerEvent.pointerId,
                      );
                      onSelectionStart(day, displayRow);
                    }}
                    className={`relative border p-0 ${
                      readOnly
                        ? "cursor-default"
                        : "cursor-pointer touch-none md:touch-auto"
                    } ${
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

                        return (
                          <EventCard
                            key={event.id}
                            event={event}
                            category={category}
                            rowStart={rowStart}
                            eventMove={eventMove}
                            onPointerDown={onEventPointerDown}
                            onPointerMove={onEventPointerMove}
                            onPointerUp={onEventPointerUp}
                            onPointerCancel={onEventPointerCancel}
                            onDelete={onDeleteEvent}
                            onEdit={onEditEvent}
                            readOnly={readOnly}
                          />
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
  );
}

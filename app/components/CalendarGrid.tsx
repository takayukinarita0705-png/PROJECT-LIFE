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
  readOnly?: boolean;
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
  readOnly = false,
}: CalendarGridProps) {
  return (
    <div
      className="overflow-auto rounded-xl border border-gray-700 bg-white select-none"
      onMouseLeave={onSelectionCancel}
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
                <div className="text-xs text-slate-300">
                  {dateLabel(weekDates[i])}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {DISPLAY_ROWS.map((row, displayRow) => (
            <tr key={row} style={{ height: ROW_HEIGHT }}>
              <td
                className="border bg-gray-100 p-1 text-xs text-gray-700"
                style={{ height: ROW_HEIGHT }}
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
                    className={`relative border p-0 ${
                      readOnly ? "cursor-default" : "cursor-pointer"
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

import { describe, expect, it } from "vitest";
import { getMorningSummary } from "@/app/lib/morningSummary";
import type { CalendarEvent, Category, LifeLog } from "@/app/types/calendar";

function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "study",
    name: "宅建業法",
    color: "#22c55e",
    icon: "📚",
    group: "study",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event",
    categoryId: "study",
    mode: "fixed",
    status: "pending",
    linkType: "none",
    offsetMinutes: 0,
    date: "2026-07-12",
    day: 5,
    start: 300,
    end: 360,
    weekOffset: 0,
    ...overrides,
  };
}

function createLog(overrides: Partial<LifeLog> = {}): LifeLog {
  return {
    id: "log",
    body: "未来メモ",
    status: "inbox",
    focusArea: "future",
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("Morning Dashboard summary", () => {
  it("今日の件数、習慣対象時間、未来Inbox件数を集計する", () => {
    const study = createCategory();
    const sleep = createCategory({
      id: "sleep",
      name: "睡眠",
      icon: "😴",
    });

    expect(
      getMorningSummary(
        [
          {
            event: createEvent({ id: "study-1", status: "completed" }),
            category: study,
          },
          {
            event: createEvent({
              id: "study-2",
              start: 370,
              end: 430,
            }),
            category: study,
          },
          {
            event: createEvent({
              id: "sleep",
              categoryId: "sleep",
              status: "completed",
              start: 1320,
              end: 1440,
            }),
            category: sleep,
          },
        ],
        [
          createLog({ id: "future-inbox" }),
          createLog({ id: "future-scheduled", status: "scheduled" }),
          createLog({ id: "unset-inbox", focusArea: "unset" }),
        ],
      ),
    ).toEqual({
      totalEvents: 3,
      completedEvents: 2,
      remainingEvents: 1,
      habitGoalMinutes: 120,
      habitActualMinutes: 60,
      futureInboxCount: 1,
    });
  });
});

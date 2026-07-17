import { describe, expect, it } from "vitest";
import {
  completeEndedAutomaticEvents,
  isAutomaticCompletionEvent,
} from "@/app/lib/autoCompletion";
import { getFutureReminderCandidates } from "@/app/lib/futureReminders";
import type { CalendarEvent, Category } from "@/app/types/calendar";

const NOW = new Date(2026, 6, 17, 10, 0, 0);

function createCategory(name: string, id = name): Category {
  return {
    id,
    name,
    color: "#334155",
    icon: "📌",
    group: "life",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

function createEvent(
  categoryId: string,
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: `${categoryId}-event`,
    categoryId,
    mode: "fixed",
    status: "pending",
    linkType: "none",
    offsetMinutes: 0,
    date: "2026-07-17",
    day: 3,
    start: 9 * 60,
    end: 10 * 60,
    weekOffset: 0,
    notificationMinutes: null,
    ...overrides,
  };
}

describe("今日の予定の自動完了", () => {
  it("仕事を終了時刻で完了し、終了日時をcompletedAtへ保存する", () => {
    const work = createCategory("仕事", "work");
    const event = createEvent(work.id);

    expect(completeEndedAutomaticEvents([event], [work], NOW)).toEqual([
      {
        ...event,
        status: "completed",
        completedAt: NOW.toISOString(),
      },
    ]);
  });

  it.each(["朝ご飯", "昼ご飯", "夜ご飯", "その他食事", "ご飯"])(
    "%sを自動完了する",
    (name) => {
      const meal = createCategory(name);
      expect(
        completeEndedAutomaticEvents(
          [createEvent(meal.id)],
          [meal],
          NOW,
        )[0]?.status,
      ).toBe("completed");
    },
  );

  it("お風呂を自動完了する", () => {
    const bath = createCategory("お風呂", "bath");
    expect(
      completeEndedAutomaticEvents(
        [createEvent(bath.id)],
        [bath],
        NOW,
      )[0]?.status,
    ).toBe("completed");
  });

  it("終了前の予定と勉強・睡眠・ライフログ由来・フリー予定は完了しない", () => {
    const work = createCategory("仕事", "work");
    const study = createCategory("勉強", "study");
    const sleep = createCategory("睡眠", "sleep");
    const free = createCategory("フリー", "free");
    const events = [
      createEvent(work.id, { id: "work-before-end", end: 10 * 60 + 1 }),
      createEvent(study.id),
      createEvent(sleep.id),
      createEvent(work.id, { id: "life-log", lifeLogId: "log-1" }),
      createEvent(free.id),
    ];

    const completed = completeEndedAutomaticEvents(
      events,
      [work, study, sleep, free],
      NOW,
    );
    expect(completed).toBe(events);
    expect(completed.every((event) => event.status === "pending")).toBe(true);
    expect(isAutomaticCompletionEvent(events[3], work)).toBe(false);
  });

  it("ライフログ由来予定の通知対象と通知設定を変更しない", () => {
    const free = createCategory("フリー", "free");
    const event = createEvent(free.id, {
      id: "life-log-reminder",
      start: 10 * 60,
      end: 11 * 60,
      lifeLogId: "log-1",
      notificationMinutes: 10,
    });
    const beforeNotification = new Date(2026, 6, 17, 9, 40);
    const candidates = getFutureReminderCandidates(
      [event],
      beforeNotification,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.event).toBe(event);

    const afterEnd = completeEndedAutomaticEvents(
      [event],
      [free],
      new Date(2026, 6, 17, 11, 30),
    );
    expect(afterEnd[0]).toBe(event);
    expect(afterEnd[0]).toMatchObject({
      status: "pending",
      notificationMinutes: 10,
    });
  });
});

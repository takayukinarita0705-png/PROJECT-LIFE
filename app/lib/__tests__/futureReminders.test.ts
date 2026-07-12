import { describe, expect, it } from "vitest";
import {
  getDueFutureReminderNotifications,
  getFutureReminderCandidates,
  getReminderNotificationTime,
} from "@/app/lib/futureReminders";
import type { CalendarEvent } from "@/app/types/calendar";

function createEvent(
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: "future-event",
    title: "歯医者予約",
    categoryId: "free",
    mode: "fixed",
    status: "pending",
    linkType: "none",
    offsetMinutes: 0,
    date: "2026-07-12",
    day: 5,
    start: 10 * 60,
    end: 11 * 60,
    weekOffset: 0,
    lifeLogId: "log-1",
    notificationMinutes: 10,
    ...overrides,
  };
}

describe("Future Reminder", () => {
  const beforeNotification = new Date("2026-07-12T09:40:00");

  it("lifeLogIdがある予定だけ通知対象になる", () => {
    expect(
      getFutureReminderCandidates([createEvent()], beforeNotification),
    ).toHaveLength(1);
    expect(
      getFutureReminderCandidates(
        [createEvent({ lifeLogId: undefined })],
        beforeNotification,
      ),
    ).toHaveLength(0);
  });

  it("通常予定は通知対象にならない", () => {
    expect(
      getFutureReminderCandidates(
        [
          createEvent({
            id: "manual",
            lifeLogId: undefined,
            notificationMinutes: 10,
          }),
        ],
        beforeNotification,
      ),
    ).toEqual([]);
  });

  it("対象外カテゴリやテンプレート・Routine予定は通知対象にならない", () => {
    expect(
      getFutureReminderCandidates(
        [
          createEvent({ id: "work", categoryId: "work" }),
          createEvent({
            id: "template",
            source: "fixed-template",
          }),
          createEvent({
            id: "routine",
            linkedToEventId: "parent",
            linkType: "after",
          }),
        ],
        beforeNotification,
      ),
    ).toEqual([]);
  });

  it("notificationMinutesの各値で通知時刻を正しく計算できる", () => {
    expect(
      [0, 10, 30, 60].map((minutes) =>
        getReminderNotificationTime(
          createEvent({ notificationMinutes: minutes }),
        )?.toISOString(),
      ),
    ).toEqual([
      new Date("2026-07-12T10:00:00").toISOString(),
      new Date("2026-07-12T09:50:00").toISOString(),
      new Date("2026-07-12T09:30:00").toISOString(),
      new Date("2026-07-12T09:00:00").toISOString(),
    ]);
  });

  it("completed / skipped は通知されない", () => {
    expect(
      getFutureReminderCandidates(
        [
          createEvent({ id: "completed", status: "completed" }),
          createEvent({ id: "skipped", status: "skipped" }),
        ],
        beforeNotification,
      ),
    ).toEqual([]);
  });

  it("同じ通知が二重送信されない", () => {
    expect(
      getDueFutureReminderNotifications(
        [
          createEvent({
            notificationSentAt: new Date(
              "2026-07-12T09:50:00",
            ).toISOString(),
          }),
        ],
        new Date("2026-07-12T09:51:00"),
      ),
    ).toEqual([]);
  });

  it("通知なし設定では通知されない", () => {
    expect(
      getFutureReminderCandidates(
        [createEvent({ notificationMinutes: null })],
        beforeNotification,
      ),
    ).toEqual([]);
  });
});

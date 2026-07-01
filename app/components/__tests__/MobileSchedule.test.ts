import { describe, expect, it } from "vitest";
import {
  getTodayProgress,
  isCurrentMobileEvent,
} from "@/app/components/MobileSchedule";
import type { CalendarEvent } from "@/app/types/calendar";

const overnightSleep: CalendarEvent = {
  id: "overnight-sleep",
  categoryId: "sleep",
  mode: "fixed",
  status: "pending",
  linkType: "none",
  offsetMinutes: 0,
  date: "2026-07-01",
  day: 0,
  start: 22 * 60,
  end: 5 * 60,
  weekOffset: 0,
};

describe("日またぎ予定の進行中判定", () => {
  it("開始後と翌日側の終了前を進行中として扱う", () => {
    expect(
      isCurrentMobileEvent(overnightSleep, "2026-07-01", 23 * 60 + 30),
    ).toBe(true);
    expect(
      isCurrentMobileEvent(overnightSleep, "2026-07-01", 4 * 60 + 59),
    ).toBe(true);
  });

  it("終了時刻以降と予定日以外では進行中にしない", () => {
    expect(
      isCurrentMobileEvent(overnightSleep, "2026-07-01", 5 * 60),
    ).toBe(false);
    expect(
      isCurrentMobileEvent(overnightSleep, "2026-07-02", 23 * 60),
    ).toBe(false);
  });
});

describe("今日の達成状況", () => {
  it("completedだけを完了として件数と達成率を計算する", () => {
    expect(
      getTodayProgress([
        { status: "completed" },
        { status: "pending" },
        {},
      ]),
    ).toEqual({
      completed: 1,
      total: 3,
      percentage: 33,
    });
  });

  it("今日の予定がない場合は達成率を0%にする", () => {
    expect(getTodayProgress([])).toEqual({
      completed: 0,
      total: 0,
      percentage: 0,
    });
  });
});

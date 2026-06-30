import { describe, expect, it } from "vitest";
import { isCurrentMobileEvent } from "@/app/components/MobileSchedule";
import type { CalendarEvent } from "@/app/types/calendar";

const overnightSleep: CalendarEvent = {
  id: "overnight-sleep",
  categoryId: "sleep",
  mode: "fixed",
  status: "pending",
  linkType: "none",
  offsetMinutes: 0,
  day: 0,
  start: 22 * 60,
  end: 5 * 60,
  weekOffset: 0,
};

describe("日またぎ予定の進行中判定", () => {
  it("開始後と翌日側の終了前を進行中として扱う", () => {
    expect(isCurrentMobileEvent(overnightSleep, 0, 23 * 60 + 30)).toBe(true);
    expect(isCurrentMobileEvent(overnightSleep, 0, 4 * 60 + 59)).toBe(true);
  });

  it("終了時刻以降と予定日以外では進行中にしない", () => {
    expect(isCurrentMobileEvent(overnightSleep, 0, 5 * 60)).toBe(false);
    expect(isCurrentMobileEvent(overnightSleep, 1, 23 * 60)).toBe(false);
  });
});

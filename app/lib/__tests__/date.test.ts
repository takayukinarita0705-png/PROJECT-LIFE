import { describe, expect, it } from "vitest";
import {
  addDaysToCalendarDate,
  compareEventDates,
  formatCalendarDate,
  getCalendarDateForWeekDay,
  getDateFromWeekOffset,
  isEventOnDate,
  isCalendarDate,
  materializeEventDate,
  resolveEventDate,
} from "@/app/lib/date";

describe("Calendar date", () => {
  const referenceDate = new Date(2026, 6, 1, 12);

  it("ローカル日付をYYYY-MM-DD形式へ変換する", () => {
    expect(formatCalendarDate(referenceDate)).toBe("2026-07-01");
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2028-02-29")).toBe(true);
  });

  it("基準週の月曜日からweekOffsetと曜日を日付へ変換する", () => {
    expect(getDateFromWeekOffset("2026-06-29", 0, 0)).toBe(
      "2026-06-29",
    );
    expect(getDateFromWeekOffset("2026-06-29", 1, 2)).toBe(
      "2026-07-08",
    );
    expect(getDateFromWeekOffset("2026-06-29", -1, 6)).toBe(
      "2026-06-28",
    );
    expect(getCalendarDateForWeekDay(0, 0, referenceDate)).toBe(
      "2026-06-29",
    );
    expect(getCalendarDateForWeekDay(1, 2, referenceDate)).toBe(
      "2026-07-08",
    );
    expect(getCalendarDateForWeekDay(-1, 6, referenceDate)).toBe(
      "2026-06-28",
    );
  });

  it("絶対日付を基準に日数を加算する", () => {
    expect(addDaysToCalendarDate("2026-06-29", 7)).toBe("2026-07-06");
  });

  it("EventにdateがあればweekOffsetとdayより優先する", () => {
    const event = {
      date: "2026-08-15",
      weekOffset: 0,
      day: 0,
    };

    expect(resolveEventDate(event, referenceDate)).toBe("2026-08-15");
    expect(isEventOnDate(event, "2026-08-15", referenceDate)).toBe(true);
  });

  it("Eventにdateがない場合だけweekOffsetとdayへフォールバックする", () => {
    const event = {
      weekOffset: 1,
      day: 2,
    };

    expect(resolveEventDate(event, referenceDate)).toBe("2026-07-08");
    expect(isEventOnDate(event, "2026-07-08", referenceDate)).toBe(true);
  });

  it("Eventを解決後の日付で比較する", () => {
    const legacyEvent = {
      weekOffset: 0,
      day: 0,
    };
    const datedEvent = {
      date: "2026-07-08",
      weekOffset: -10,
      day: 0,
    };

    expect(compareEventDates(legacyEvent, datedEvent, referenceDate)).toBeLessThan(
      0,
    );
  });

  it("保存対象Eventへdateを実体化し、既存dateを正とする", () => {
    const legacyEvent = {
      id: "legacy",
      categoryId: "work",
      mode: "fixed" as const,
      status: "pending" as const,
      linkType: "none" as const,
      offsetMinutes: 0,
      day: 2,
      weekOffset: 1,
      start: 540,
      end: 600,
    };
    const datedEvent = {
      ...legacyEvent,
      date: "2026-08-15",
      day: 0,
      weekOffset: 0,
    };

    expect(materializeEventDate(legacyEvent, referenceDate).date).toBe(
      "2026-07-08",
    );
    expect(materializeEventDate(datedEvent, referenceDate)).toBe(datedEvent);
  });
});

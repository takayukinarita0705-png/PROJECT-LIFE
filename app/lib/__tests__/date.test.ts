import { describe, expect, it } from "vitest";
import {
  addDaysToCalendarDate,
  formatCalendarDate,
  getCalendarDateForWeekDay,
  getDateFromWeekOffset,
  isCalendarDate,
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
});

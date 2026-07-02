import { describe, expect, it } from "vitest";
import {
  WEEKLY_REVIEW_DAY,
  getInitialMobilePage,
  isWeeklyReviewDay,
} from "@/app/lib/review";

describe("週間レビュー日", () => {
  it("レビュー日を水曜日として定義する", () => {
    const wednesday = new Date(2026, 6, 1, 12);

    expect(WEEKLY_REVIEW_DAY).toBe(3);
    expect(isWeeklyReviewDay(wednesday)).toBe(true);
    expect(getInitialMobilePage(wednesday)).toBe("week");
  });

  it("水曜日以外は今日ページを初期表示する", () => {
    const thursday = new Date(2026, 6, 2, 12);

    expect(isWeeklyReviewDay(thursday)).toBe(false);
    expect(getInitialMobilePage(thursday)).toBe("today");
  });
});

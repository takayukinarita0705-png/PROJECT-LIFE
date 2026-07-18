import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StudyTimeCard from "@/app/components/StudyTimeCard";

describe("今日の勉強カード", () => {
  it("今日・継続・今週・進捗バーを落ち着いたレスポンシブUIで表示する", () => {
    const markup = renderToStaticMarkup(
      <StudyTimeCard
        summary={{
          todayMinutes: 85,
          weekMinutes: 380,
          streakDays: 7,
          nextStreakDays: 7,
          studiedToday: true,
          progressPercentage: 71,
          days: [],
        }}
      />,
    );

    expect(markup).toContain("📚 今日の勉強");
    expect(markup).toContain("85分");
    expect(markup).toContain("🔥 7日継続");
    expect(markup).toContain("今日の学習を記録しました");
    expect(markup).toContain("6時間20分");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="85"');
    expect(markup).toContain("width:71%");
    expect(markup).toContain("dark:bg-slate-900");
  });

  it("今日が未記録なら継続予定日数を表示する", () => {
    const markup = renderToStaticMarkup(
      <StudyTimeCard
        summary={{
          todayMinutes: 0,
          weekMinutes: 295,
          streakDays: 7,
          nextStreakDays: 8,
          studiedToday: false,
          progressPercentage: 0,
          days: [],
        }}
      />,
    );

    expect(markup).toContain("今日も勉強すると8日継続になります");
  });
});

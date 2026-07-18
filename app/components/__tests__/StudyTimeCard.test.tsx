import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StudyTimeCard from "@/app/components/StudyTimeCard";
import type { StudyTimeSummary } from "@/app/lib/studyTime";

function createSummary(
  overrides: Partial<StudyTimeSummary> = {},
): StudyTimeSummary {
  return {
    todayMinutes: 85,
    weekMinutes: 380,
    totalMinutes: 7720,
    dailyGoalMinutes: 60,
    remainingGoalMinutes: 0,
    achievedDailyGoal: true,
    streakDays: 7,
    nextStreakDays: 7,
    studiedToday: true,
    progressPercentage: 142,
    days: [
      { date: "2026-07-14", label: "火", minutes: 60 },
      { date: "2026-07-15", label: "水", minutes: 90 },
      { date: "2026-07-16", label: "木", minutes: 30 },
      { date: "2026-07-17", label: "金", minutes: 85 },
      { date: "2026-07-18", label: "土", minutes: 115 },
      { date: "2026-07-19", label: "日", minutes: 0 },
      { date: "2026-07-20", label: "月", minutes: 0 },
    ],
    ...overrides,
  };
}

describe("勉強ダッシュボード", () => {
  it("今日・今週・累計・目標達成・継続・火曜始まりグラフを表示する", () => {
    const markup = renderToStaticMarkup(
      <StudyTimeCard
        summary={createSummary()}
        onChangeDailyGoal={() => undefined}
        onOpenHistory={() => undefined}
      />,
    );

    expect(markup).toContain("📚 今日の勉強");
    expect(markup).toContain("85");
    expect(markup).toContain("/ 60分");
    expect(markup).toContain("6時間20分");
    expect(markup).toContain("128時間40分");
    expect(markup).toContain("🔥 7日継続");
    expect(markup).toContain("勉強履歴を見る");
    expect(markup).toContain("✅ 今日の目標達成！");
    expect(markup).toContain("142%");
    expect(markup).toContain("火曜はじまり");
    expect(markup).toContain("火");
    expect(markup).toContain("月");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuemax="60"');
    expect(markup).toContain("width:100%");
    expect(markup).toContain("dark:bg-slate-900");
  });

  it("今日が未記録なら継続への短い案内を表示する", () => {
    const markup = renderToStaticMarkup(
      <StudyTimeCard
        summary={createSummary({
          todayMinutes: 0,
          remainingGoalMinutes: 60,
          achievedDailyGoal: false,
          streakDays: 7,
          nextStreakDays: 8,
          studiedToday: false,
          progressPercentage: 0,
        })}
        onChangeDailyGoal={() => undefined}
        onOpenHistory={() => undefined}
      />,
    );

    expect(markup).toContain("あと1分で8日継続！");
  });
});

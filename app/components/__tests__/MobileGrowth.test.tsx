import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MobileGrowth from "@/app/components/MobileGrowth";
import type { GrowthDashboard } from "@/app/lib/growth";

const dashboard: GrowthDashboard = {
  totalStudyMinutes: 7720,
  longestStudyStreak: 32,
  totalCompletedTasks: 842,
  totalLifeLogs: 365,
  monthStudyMinutes: 380,
  monthCompletedTasks: 42,
  monthLifeLogs: 18,
  monthRoutineAchievementRate: 86,
  dailyPoints: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    label: `7/${index + 1}`,
    studyMinutes: index % 3 === 0 ? 60 : 0,
    completedTasks: index % 2,
  })),
  milestones: [
    { hours: 100, achieved: true, remainingMinutes: 0 },
    { hours: 250, achieved: false, remainingMinutes: 7280 },
    { hours: 500, achieved: false, remainingMinutes: 22280 },
    { hours: 1000, achieved: false, remainingMinutes: 52280 },
  ],
  recentItems: [
    {
      id: "study-1",
      icon: "📚",
      title: "宅建業法",
      detail: "60分",
      timestamp: "2026-07-18T11:15:00.000Z",
      type: "study",
    },
  ],
};

describe("積み上げページ", () => {
  it("全期間・今月・30日グラフ・マイルストーン・最近の記録を表示する", () => {
    const markup = renderToStaticMarkup(
      <MobileGrowth dashboard={dashboard} />,
    );

    expect(markup).toContain("🌱 積み上げ");
    expect(markup).toContain("128時間40分");
    expect(markup).toContain("32日");
    expect(markup).toContain("842件");
    expect(markup).toContain("365件");
    expect(markup).toContain("今月");
    expect(markup).toContain("86%");
    expect(markup).toContain("最近30日");
    expect(markup).toContain("最近30日の勉強時間グラフ");
    expect(markup).toContain("最近30日の完了タスク数グラフ");
    expect(markup).toContain("✅ 累計100時間");
    expect(markup).toContain("累計250時間");
    expect(markup).toContain("あと121時間20分");
    expect(markup).toContain("宅建業法");
    expect(markup).toContain("dark:bg-slate-900");
  });
});

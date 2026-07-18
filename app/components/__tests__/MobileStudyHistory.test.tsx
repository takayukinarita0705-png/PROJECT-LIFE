import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MobileStudyHistory from "@/app/components/MobileStudyHistory";
import type { StudyHistoryEntry } from "@/app/lib/studyTime";

function createEntry(
  overrides: Partial<StudyHistoryEntry> = {},
): StudyHistoryEntry {
  return {
    id: "history-1",
    taskId: "task-1",
    taskTitle: "宅建業法",
    categoryId: "takken-law",
    categoryName: "宅建業法",
    categoryGroup: "takken",
    studyDate: "2026-07-18",
    minutes: 60,
    createdAt: "2026-07-18T11:15:00.000Z",
    updatedAt: "2026-07-18T11:15:00.000Z",
    source: "scheduled_duration",
    ...overrides,
  };
}

describe("勉強履歴画面", () => {
  it("合計・検索・カテゴリフィルター・新しい順のカードを表示する", () => {
    const markup = renderToStaticMarkup(
      <MobileStudyHistory
        entries={[
          createEntry(),
          createEntry({
            id: "history-2",
            taskTitle: "権利関係",
            categoryName: "権利関係",
            studyDate: "2026-07-17",
            minutes: 45,
          }),
        ]}
        todayMinutes={60}
        weekMinutes={380}
        monthMinutes={1200}
        totalMinutes={7720}
        onBack={() => undefined}
        onDelete={() => true}
        onUpdateMinutes={() => true}
      />,
    );

    expect(markup).toContain("勉強履歴");
    expect(markup).toContain("今日");
    expect(markup).toContain("今週");
    expect(markup).toContain("今月");
    expect(markup).toContain("累計");
    expect(markup).toContain("6時間20分");
    expect(markup).toContain("128時間40分");
    expect(markup).toContain("タイトル検索");
    expect(markup).toContain("すべて");
    expect(markup).toContain("宅建");
    expect(markup).toContain("勉強");
    expect(markup).toContain("2026/07/18 20:15");
    expect(markup.indexOf("宅建業法")).toBeLessThan(
      markup.indexOf("権利関係"),
    );
    expect(markup).toContain("dark:bg-slate-900");
  });
});

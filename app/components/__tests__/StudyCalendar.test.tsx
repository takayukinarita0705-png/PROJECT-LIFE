import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StudyCalendar from "@/app/components/StudyCalendar";

describe("勉強カレンダー", () => {
  it("日別の濃淡、今日の枠線、継続日数、選択日のタスクを表示する", () => {
    const markup = renderToStaticMarkup(
      <StudyCalendar
        today="2026-07-18"
        streakDays={7}
        days={[
          { date: "2026-07-17", minutes: 0, tasks: [] },
          {
            date: "2026-07-18",
            minutes: 85,
            tasks: [
              {
                taskId: "takken-task",
                title: "宅建業法 過去問",
                minutes: 85,
              },
            ],
          },
        ]}
      />,
    );

    expect(markup).toContain("勉強カレンダー");
    expect(markup).toContain("直近90日の積み上げ");
    expect(markup).toContain("🔥 7日継続");
    expect(markup).toContain("2026-07-17: 0分");
    expect(markup).toContain("2026-07-18: 85分");
    expect(markup).toContain("bg-slate-100");
    expect(markup).toContain("bg-indigo-400");
    expect(markup).toContain("ring-indigo-700");
    expect(markup).toContain("7月18日（土）");
    expect(markup).toContain("宅建業法 過去問");
    expect(markup).toContain("dark:bg-slate-900");
  });
});

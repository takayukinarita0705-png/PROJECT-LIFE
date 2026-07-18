import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MobileSchedule from "@/app/components/MobileSchedule";
import type { CalendarEvent, Category } from "@/app/types/calendar";

function createCategory(id: string, name: string): Category {
  return {
    id,
    name,
    color: "#334155",
    icon: "📌",
    group: "life",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

function createEvent(
  categoryId: string,
  status: CalendarEvent["status"] = "pending",
): CalendarEvent {
  return {
    id: `${categoryId}-event`,
    categoryId,
    mode: "fixed",
    status,
    linkType: "none",
    offsetMinutes: 0,
    date: "2026-07-17",
    day: 3,
    start: 9 * 60,
    end: 10 * 60,
    weekOffset: 0,
    notificationMinutes: null,
  };
}

function renderSchedule(category: Category, event: CalendarEvent) {
  return renderToStaticMarkup(
    <MobileSchedule
      completionStreak={0}
      currentTime={new Date(2026, 6, 17, 11)}
      currentDay={3}
      hasCheckedLocalCache
      hasLoadedEvents
      logs={[]}
      onOpenActualsSummary={() => undefined}
      onOpenFutureLogsSummary={() => undefined}
      onMoveToTomorrow={() => undefined}
      onCompleteStudy={() => ({ status: "completed" })}
      onChangeStudyDailyGoal={() => undefined}
      onOpenLifeLog={() => undefined}
      onPostpone={() => undefined}
      onOpenScheduleSummary={() => undefined}
      onOpenStreakSummary={() => undefined}
      onResetStatus={() => undefined}
      onToggleCompleted={() => undefined}
      onToggleSkipped={() => undefined}
      studyTimeSummary={null}
      studyCalendarDays={[]}
      studyCalendarToday="2026-07-17"
      todaySchedule={[{ category, event }]}
    />,
  );
}

describe("今日画面の完了操作", () => {
  it("自動完了対象には完了ボタンを表示しない", () => {
    const work = createCategory("work", "仕事");
    const markup = renderSchedule(work, createEvent(work.id));

    expect(markup).not.toContain('aria-label="仕事を完了"');
    expect(markup).toContain("スキップ");
  });

  it("自動完了後は現在の完了デザインでチェック表示だけを出す", () => {
    const work = createCategory("work", "仕事");
    const markup = renderSchedule(
      work,
      createEvent(work.id, "completed"),
    );

    expect(markup).toContain("✓ 完了");
    expect(markup).not.toContain('aria-label="仕事を未完了に戻す"');
  });

  it("勉強は従来通り完了ボタンを表示する", () => {
    const study = createCategory("study", "勉強");
    const markup = renderSchedule(study, createEvent(study.id));

    expect(markup).toContain('aria-label="勉強を完了"');
  });
});

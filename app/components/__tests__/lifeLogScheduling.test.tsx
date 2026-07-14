import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EventDialog from "@/app/components/EventDialog";
import LifeLogDialog from "@/app/components/LifeLogDialog";
import MobileLifeLog from "@/app/components/MobileLifeLog";
import { FREE_CATEGORY } from "@/app/lib/calendar";
import type { LifeLog, LifeLogFocusArea } from "@/app/types/calendar";

const createdAt = "2026-07-14T00:00:00.000Z";

function createLog(
  id: string,
  focusArea: LifeLogFocusArea,
  overrides: Partial<LifeLog> = {},
): LifeLog {
  return {
    id,
    body: `${focusArea}のログ`,
    status: "inbox",
    focusArea,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe("ライフログ予定化UI", () => {
  it("すべてのfocusAreaで予定化ボタンを表示する", () => {
    const focusAreas: LifeLogFocusArea[] = [
      "unset",
      "now",
      "future",
      "review",
      "discard",
    ];
    const markup = renderToStaticMarkup(
      <MobileLifeLog
        hasCheckedLocalCache
        hasLoadedState
        logs={focusAreas.map((focusArea) =>
          createLog(focusArea, focusArea),
        )}
        onAdd={() => undefined}
        onClassify={() => undefined}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onOpenEvent={() => undefined}
        onSchedule={() => undefined}
      />,
    );

    expect(markup.match(/予定にする/g)).toHaveLength(5);
  });

  it("予定化済みと完了済みには予定化ボタンを表示しない", () => {
    const markup = renderToStaticMarkup(
      <MobileLifeLog
        hasCheckedLocalCache
        hasLoadedState
        logs={[
          createLog("scheduled", "future", {
            status: "scheduled",
            eventId: "event-1",
          }),
          createLog("done", "review", {
            status: "done",
            eventId: "event-2",
          }),
        ]}
        onAdd={() => undefined}
        onClassify={() => undefined}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onOpenEvent={() => undefined}
        onSchedule={() => undefined}
      />,
    );

    expect(markup).not.toContain("予定にする");
    expect(markup).toContain("予定化済み");
    expect(markup).toContain("完了");
  });

  it("ライフログ作成・編集画面に既存予定への紐付けUIを表示しない", () => {
    const markup = renderToStaticMarkup(
      <LifeLogDialog
        log={createLog("legacy", "future", { eventId: "event-1" })}
        onCancel={() => undefined}
        onSave={() => true}
      />,
    );

    expect(markup).not.toContain("予定に紐付ける");
    expect(markup).not.toContain("現在紐付いている予定");
  });

  it("予定化画面の初期所要時間を30分後にする", () => {
    const markup = renderToStaticMarkup(
      <EventDialog
        draft={{
          date: "",
          day: 0,
          weekOffset: 0,
          start: 0,
          end: 0,
          title: "予定タイトル",
          lifeLogId: "log-1",
        }}
        categories={[FREE_CATEGORY]}
        activeCategoryId="free"
        requiresScheduleDetails
        onCategoryChange={() => undefined}
        onTitleChange={() => undefined}
        onCancel={() => undefined}
        onAdd={() => undefined}
      />,
    );

    expect(markup).toContain('<option value="30" selected="">30分後</option>');
    expect(markup).not.toContain("終了時間（カスタム）");
    expect(markup).not.toContain("<option value=\"work\"");
  });
});

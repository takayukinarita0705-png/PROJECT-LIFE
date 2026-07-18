import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EventDialog, {
  getEventDialogTimeDetails,
  MobileWeekEventDialog,
} from "@/app/components/EventDialog";
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

  it("予定化済みは表示し、完了済みは一覧から非表示にする", () => {
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
    expect(markup).not.toContain("reviewのログ");
    expect(markup).not.toContain("ライフログ完了");
  });

  it("ライフログ作成・編集画面に既存予定への紐付けUIを表示しない", () => {
    const markup = renderToStaticMarkup(
      <LifeLogDialog
        log={createLog("legacy", "future", { eventId: "event-1" })}
        onCancel={() => undefined}
        onSave={() => null}
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

  it("スマホ予定追加モーダルは本文をスクロールでき下部ナビより前面に表示する", () => {
    const markup = renderToStaticMarkup(
      <EventDialog
        draft={{
          date: "2026-07-14",
          day: 0,
          weekOffset: 0,
          start: 9 * 60 + 30,
          end: 10 * 60 + 30,
          title: "週間予定",
        }}
        categories={[FREE_CATEGORY]}
        activeCategoryId={FREE_CATEGORY.id}
        onCategoryChange={() => undefined}
        onTitleChange={() => undefined}
        onCancel={() => undefined}
        onAdd={() => undefined}
      />,
    );

    expect(markup).toContain("z-[160]");
    expect(markup).toContain("mobile-modal-panel");
    expect(markup).toContain("mobile-modal-body");
    expect(markup).toContain('type="time"');
    expect(markup).toContain('value="09:30"');
    expect(markup).toContain('value="10:30"');
    expect(markup).not.toContain("inputmode=");
  });

  it("時刻選択値を保存用の分へ変換し終了時刻以前を拒否する", () => {
    expect(getEventDialogTimeDetails("09:35", "10:50")).toEqual({
      details: { start: 9 * 60 + 35, end: 10 * 60 + 50 },
      error: "",
    });
    expect(getEventDialogTimeDetails("09:35", "09:35")).toEqual({
      details: null,
      error: "終了時刻は開始時刻より後を選択してください。",
    });
    expect(getEventDialogTimeDetails("10:00", "09:30")).toEqual({
      details: null,
      error: "終了時刻は開始時刻より後を選択してください。",
    });
  });

  it("既存の日付またぎ予定は時刻選択UIのまま翌日終了を維持する", () => {
    expect(getEventDialogTimeDetails("23:30", "00:00", true)).toEqual({
      details: { start: 23 * 60 + 30, end: 24 * 60 },
      error: "",
    });
  });

  it("予定詳細にライフログ作成ボタンを表示する", () => {
    const markup = renderToStaticMarkup(
      <MobileWeekEventDialog
        draft={{
          eventId: "event-1",
          title: "朝の散歩",
          categoryId: FREE_CATEGORY.id,
          start: "09:00",
          end: "09:30",
        }}
        categories={[FREE_CATEGORY]}
        relatedLifeLog={null}
        error=""
        onChange={() => undefined}
        onCancel={() => undefined}
        onDelete={() => undefined}
        onCreateLifeLog={() => undefined}
        onOpenLifeLog={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain("関連ライフログ");
    expect(markup).toContain("ライフログを作成");
    expect(markup.match(/type="time"/g)).toHaveLength(2);
    expect(markup).not.toContain("inputmode=");
    expect(markup).toContain("mobile-modal-body");
    expect(markup).toContain("z-[160]");
  });

  it("関連ログがある予定ではライフログを開くUIへ切り替える", () => {
    const relatedLog = createLog("log-1", "unset", {
      title: "朝の散歩",
      body: "",
      eventId: "event-1",
      origin: "event",
    });
    const markup = renderToStaticMarkup(
      <MobileWeekEventDialog
        draft={{
          eventId: "event-1",
          title: "朝の散歩",
          categoryId: FREE_CATEGORY.id,
          start: "09:00",
          end: "09:30",
        }}
        categories={[FREE_CATEGORY]}
        relatedLifeLog={relatedLog}
        error=""
        onChange={() => undefined}
        onCancel={() => undefined}
        onDelete={() => undefined}
        onCreateLifeLog={() => undefined}
        onOpenLifeLog={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain("ライフログを開く");
    expect(markup).not.toContain("ライフログを作成");
    expect(markup).toContain("朝の散歩");
  });

  it("予定から開いた新規ログ画面へタイトルをコピーして生成元を表示する", () => {
    const markup = renderToStaticMarkup(
      <LifeLogDialog
        log={null}
        initialTitle="朝の散歩"
        isCreatedFromEvent
        onCancel={() => undefined}
        onSave={() => null}
      />,
    );

    expect(markup).toContain('value="朝の散歩"');
    expect(markup).toContain("このログは予定から作成されました");
    expect(markup).toContain("未分類");
  });
});

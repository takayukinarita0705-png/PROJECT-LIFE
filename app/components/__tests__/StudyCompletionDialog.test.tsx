import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StudyCompletionDialog, {
  addQuickStudyMinutes,
  parseStudyMinutes,
} from "@/app/components/StudyCompletionDialog";

describe("勉強時間入力ダイアログ", () => {
  it("クイック追加・自由入力・キャンセル・記録操作を表示する", () => {
    const markup = renderToStaticMarkup(
      <StudyCompletionDialog
        title="宅建業法"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(markup).toContain("何分勉強しましたか？");
    expect(markup).toContain("+15分");
    expect(markup).toContain("+30分");
    expect(markup).toContain("+60分");
    expect(markup).toContain("自由入力（分）");
    expect(markup).toContain('type="number"');
    expect(markup).toContain("キャンセル");
    expect(markup).toContain("完了して記録");
    expect(markup).toContain("disabled");
  });

  it("クイックボタンは分数を加算し、自由入力は正の整数だけ受け付ける", () => {
    expect(addQuickStudyMinutes("", 15)).toBe("15");
    expect(addQuickStudyMinutes("15", 30)).toBe("45");
    expect(addQuickStudyMinutes("45", 60)).toBe("105");
    expect(parseStudyMinutes("85")).toBe(85);
    expect(parseStudyMinutes("0")).toBeNull();
    expect(parseStudyMinutes("1.5")).toBeNull();
  });
});

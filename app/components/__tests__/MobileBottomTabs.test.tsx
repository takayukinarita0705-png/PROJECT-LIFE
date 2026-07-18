import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MobileBottomTabs from "@/app/components/MobileBottomTabs";

describe("スマホ下部ナビゲーション", () => {
  it("積み上げを含む5つのトップレベルページを表示する", () => {
    const markup = renderToStaticMarkup(
      <MobileBottomTabs activePage="growth" onChange={() => undefined} />,
    );
    expect(markup).toContain("今日");
    expect(markup).toContain("今週");
    expect(markup).toContain("積み上げ");
    expect(markup).toContain("ログ");
    expect(markup).toContain("設定");
    expect(markup).toContain("grid-cols-5");
    expect(markup).toContain('aria-current="page"');
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  MOBILE_SCROLL_TARGETS,
  getMorningSummaryDestination,
  scrollToMobileTarget,
} from "@/app/lib/mobileNavigation";

function createScrollDocument(targetExists: boolean) {
  const scrollIntoView = vi.fn();

  return {
    document: {
      getElementById: vi.fn(() =>
        targetExists ? { scrollIntoView } : null,
      ),
    },
    scrollIntoView,
  };
}

describe("mobile summary navigation", () => {
  it("予定一覧へ移動できる", () => {
    expect(getMorningSummaryDestination("todaySchedule")).toEqual({
      page: "today",
      scrollTarget: MOBILE_SCROLL_TARGETS.todaySchedule,
    });

    const { document, scrollIntoView } = createScrollDocument(true);
    expect(
      scrollToMobileTarget(MOBILE_SCROLL_TARGETS.todaySchedule, document),
    ).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("今日の実績へ移動できる", () => {
    expect(getMorningSummaryDestination("todayActuals")).toEqual({
      page: "today",
      scrollTarget: MOBILE_SCROLL_TARGETS.todayActuals,
    });

    const { document, scrollIntoView } = createScrollDocument(true);
    expect(
      scrollToMobileTarget(MOBILE_SCROLL_TARGETS.todayActuals, document),
    ).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledOnce();
  });

  it("未来を作る一覧へ移動できる", () => {
    expect(getMorningSummaryDestination("futureLogs")).toEqual({
      page: "log",
      lifeLogFilter: "future",
    });
  });

  it("今週の連続達成へ移動できる", () => {
    expect(getMorningSummaryDestination("completionStreak")).toEqual({
      page: "week",
      scrollTarget: MOBILE_SCROLL_TARGETS.weekCompletionStreak,
    });

    const { document, scrollIntoView } = createScrollDocument(true);
    expect(
      scrollToMobileTarget(
        MOBILE_SCROLL_TARGETS.weekCompletionStreak,
        document,
      ),
    ).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledOnce();
  });

  it("遷移先がない場合もエラーにならない", () => {
    const { document, scrollIntoView } = createScrollDocument(false);

    expect(
      scrollToMobileTarget(MOBILE_SCROLL_TARGETS.todaySchedule, document),
    ).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

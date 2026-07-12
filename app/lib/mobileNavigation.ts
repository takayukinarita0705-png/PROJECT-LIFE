import type { LifeLogFocusFilter } from "@/app/lib/lifeLogs";
import type { MobilePage } from "@/app/components/MobileBottomTabs";

export const MOBILE_SCROLL_TARGETS = {
  todayActuals: "mobile-today-actuals",
  todaySchedule: "mobile-today-schedule",
  weekCompletionStreak: "mobile-week-completion-streak",
} as const;

export type MobileScrollTargetId =
  (typeof MOBILE_SCROLL_TARGETS)[keyof typeof MOBILE_SCROLL_TARGETS];

export type MorningSummaryAction =
  | "todaySchedule"
  | "todayActuals"
  | "futureLogs"
  | "completionStreak";

export type MorningSummaryDestination = {
  page?: MobilePage;
  lifeLogFilter?: LifeLogFocusFilter;
  scrollTarget?: MobileScrollTargetId;
};

type ScrollDocument = {
  getElementById: (id: string) => Pick<Element, "scrollIntoView"> | null;
};

export function getMorningSummaryDestination(
  action: MorningSummaryAction,
): MorningSummaryDestination {
  switch (action) {
    case "todaySchedule":
      return {
        page: "today",
        scrollTarget: MOBILE_SCROLL_TARGETS.todaySchedule,
      };
    case "todayActuals":
      return {
        page: "today",
        scrollTarget: MOBILE_SCROLL_TARGETS.todayActuals,
      };
    case "futureLogs":
      return {
        page: "log",
        lifeLogFilter: "future",
      };
    case "completionStreak":
      return {
        page: "week",
        scrollTarget: MOBILE_SCROLL_TARGETS.weekCompletionStreak,
      };
  }
}

export function scrollToMobileTarget(
  targetId: MobileScrollTargetId,
  scrollDocument: ScrollDocument = document,
) {
  const target = scrollDocument.getElementById(targetId);
  if (!target) return false;

  target.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
  return true;
}

export const WEEKLY_REVIEW_DAY = 3;

export function isWeeklyReviewDay(date: Date) {
  return date.getDay() === WEEKLY_REVIEW_DAY;
}

export function getInitialMobilePage(date: Date): "today" | "week" {
  return isWeeklyReviewDay(date) ? "week" : "today";
}

import type { LifeLog } from "@/app/types/calendar";

export function normalizeLifeLogBody(body: string) {
  const normalized = body.trim();
  return normalized || null;
}

export function sortLifeLogsNewestFirst(logs: LifeLog[]) {
  return [...logs].sort(
    (first, second) =>
      Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );
}

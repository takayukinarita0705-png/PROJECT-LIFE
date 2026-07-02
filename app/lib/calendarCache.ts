import { normalizeSharedCalendarState } from "@/app/lib/supabaseStorage";
import type { SharedCalendarState } from "@/app/types/calendar";

const CALENDAR_CACHE_KEY = "project-life-shared-state-v2";

export function serializeSharedCalendarState(
  state: SharedCalendarState,
) {
  return JSON.stringify(state);
}

export function parseCachedCalendarState(value: string | null) {
  if (value === null) return null;

  try {
    return normalizeSharedCalendarState(JSON.parse(value));
  } catch {
    return null;
  }
}

export function loadCachedCalendarState() {
  try {
    return parseCachedCalendarState(
      window.localStorage.getItem(CALENDAR_CACHE_KEY),
    );
  } catch {
    return null;
  }
}

export function saveCachedCalendarState(state: SharedCalendarState) {
  try {
    window.localStorage.setItem(
      CALENDAR_CACHE_KEY,
      serializeSharedCalendarState(state),
    );
  } catch {
    // キャッシュが利用できない環境でもSupabase同期は継続する。
  }
}

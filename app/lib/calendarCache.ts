import { normalizeSharedCalendarState } from "@/app/lib/supabaseStorage";
import type { SharedCalendarState } from "@/app/types/calendar";

const CALENDAR_CACHE_KEY = "project-life-shared-state-v2";
type CacheReader = Pick<Storage, "getItem">;
type CacheWriter = Pick<Storage, "setItem">;

export function serializeSharedCalendarState(
  state: SharedCalendarState,
) {
  return JSON.stringify(state);
}

export function areSharedCalendarStatesEqual(
  first: SharedCalendarState,
  second: SharedCalendarState,
) {
  return (
    serializeSharedCalendarState(first) ===
    serializeSharedCalendarState(second)
  );
}

export function parseCachedCalendarState(value: string | null) {
  if (value === null) return null;

  try {
    return normalizeSharedCalendarState(JSON.parse(value));
  } catch {
    return null;
  }
}

export function loadCachedCalendarState(
  storage: CacheReader = window.localStorage,
) {
  try {
    return parseCachedCalendarState(
      storage.getItem(CALENDAR_CACHE_KEY),
    );
  } catch {
    return null;
  }
}

export function saveCachedCalendarState(
  state: SharedCalendarState,
  storage: CacheWriter = window.localStorage,
) {
  try {
    storage.setItem(
      CALENDAR_CACHE_KEY,
      serializeSharedCalendarState(state),
    );
  } catch {
    // キャッシュが利用できない環境でもSupabase同期は継続する。
  }
}

import { DEFAULT_CATEGORIES } from "@/app/lib/calendar";
import {
  normalizeCategory,
  normalizeCalendarEvent,
  normalizeCalendarTemplate,
} from "@/app/lib/storage";
import { getSupabaseClient } from "@/app/lib/supabase";
import type { SharedCalendarState } from "@/app/types/calendar";

const TABLE_NAME = "project_life_state";
const SHARED_STATE_ID = "default";
const SHARED_STATE_VERSION = 1;

function createEmptySharedState(): SharedCalendarState {
  return {
    version: SHARED_STATE_VERSION,
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    events: [],
    templates: [],
  };
}

function hasNoNull<T>(values: (T | null)[]): values is T[] {
  return values.every((value) => value !== null);
}

function normalizeSharedCalendarState(
  value: unknown,
): SharedCalendarState | null {
  if (typeof value !== "object" || value === null) return null;

  const state = value as Record<string, unknown>;
  if (
    state.version !== SHARED_STATE_VERSION ||
    !Array.isArray(state.categories) ||
    !Array.isArray(state.events) ||
    !Array.isArray(state.templates)
  ) {
    return null;
  }

  const categories = state.categories.map(normalizeCategory);
  const events = state.events.map(normalizeCalendarEvent);
  const templates = state.templates.map(normalizeCalendarTemplate);
  if (
    !hasNoNull(categories) ||
    !hasNoNull(events) ||
    !hasNoNull(templates)
  ) {
    return null;
  }

  return {
    version: SHARED_STATE_VERSION,
    categories,
    events,
    templates,
  };
}

export async function loadSharedCalendarState() {
  const { data, error } = await getSupabaseClient()
    .from(TABLE_NAME)
    .select("state")
    .eq("id", SHARED_STATE_ID)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Supabaseから予定を読み込めませんでした。${error.message}`,
    );
  }

  if (!data) return createEmptySharedState();

  const state = normalizeSharedCalendarState(data.state);
  if (!state) {
    throw new Error("Supabaseの予定データ形式が正しくありません。");
  }

  return state;
}

export async function saveSharedCalendarState(
  state: SharedCalendarState,
) {
  const { error } = await getSupabaseClient()
    .from(TABLE_NAME)
    .upsert(
      {
        id: SHARED_STATE_ID,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    throw new Error(
      `Supabaseへ予定を保存できませんでした。${error.message}`,
    );
  }
}

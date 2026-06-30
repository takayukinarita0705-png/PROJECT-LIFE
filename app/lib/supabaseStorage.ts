import { DEFAULT_CATEGORIES } from "@/app/lib/calendar";
import {
  isCalendarEvent,
  isCalendarTemplate,
  isCategory,
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

function isSharedCalendarState(value: unknown): value is SharedCalendarState {
  if (typeof value !== "object" || value === null) return false;

  const state = value as Record<string, unknown>;
  return (
    state.version === SHARED_STATE_VERSION &&
    Array.isArray(state.categories) &&
    state.categories.every(isCategory) &&
    Array.isArray(state.events) &&
    state.events.every(isCalendarEvent) &&
    Array.isArray(state.templates) &&
    state.templates.every(isCalendarTemplate)
  );
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

  const state: unknown = data.state;
  if (!isSharedCalendarState(state)) {
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

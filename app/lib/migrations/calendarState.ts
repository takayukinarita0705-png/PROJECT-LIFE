import { getDateFromWeekOffset } from "@/app/lib/date";

export const CURRENT_SCHEMA_VERSION = 2 as const;
const LEGACY_SCHEMA_VERSION = 1;

export type MigratableState = Record<string, unknown> & {
  schemaVersion?: unknown;
};

export type MigratedState = Record<string, unknown> & {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
};

export function migrateStateV1ToV2(
  state: MigratableState,
  anchorWeekStart: Date,
): MigratedState {
  const events = Array.isArray(state.events)
    ? state.events.map((value) => {
        if (typeof value !== "object" || value === null) return value;

        const event = value as Record<string, unknown>;
        if (
          typeof event.date === "string" ||
          typeof event.weekOffset !== "number" ||
          !Number.isInteger(event.weekOffset) ||
          typeof event.day !== "number" ||
          !Number.isInteger(event.day)
        ) {
          return event;
        }

        return {
          ...event,
          date: getDateFromWeekOffset(
            anchorWeekStart,
            event.weekOffset,
            event.day,
          ),
        };
      })
    : state.events;

  return {
    ...state,
    events,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

function getAnchorWeekStart(referenceDate: Date) {
  const anchorWeekStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
  );
  const currentDay = anchorWeekStart.getDay();
  anchorWeekStart.setDate(
    anchorWeekStart.getDate() + (currentDay === 0 ? -6 : 1 - currentDay),
  );
  return anchorWeekStart;
}

export function migrateState(
  state: MigratableState,
  referenceDate = new Date(),
): MigratedState | null {
  const schemaVersion =
    state.schemaVersion ?? LEGACY_SCHEMA_VERSION;

  if (schemaVersion === LEGACY_SCHEMA_VERSION) {
    return migrateStateV1ToV2(
      state,
      getAnchorWeekStart(referenceDate),
    );
  }
  if (schemaVersion !== CURRENT_SCHEMA_VERSION) return null;

  // TODO: schemaVersionが増えた際に段階的なMigration処理を追加する。
  return {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

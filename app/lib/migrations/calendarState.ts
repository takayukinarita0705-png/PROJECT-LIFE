import { getDateFromWeekOffset } from "@/app/lib/date";

export const CURRENT_SCHEMA_VERSION = 3 as const;
const LEGACY_SCHEMA_VERSION = 1;
const DATE_SCHEMA_VERSION = 2;

export type MigratableState = Record<string, unknown> & {
  schemaVersion?: unknown;
};

export type MigratedState = Record<string, unknown> & {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
};

export function migrateStateV1ToV2(
  state: MigratableState,
  anchorWeekStart: Date,
): MigratableState & { schemaVersion: typeof DATE_SCHEMA_VERSION } {
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
    schemaVersion: DATE_SCHEMA_VERSION,
  };
}

export function migrateStateV2ToV3(
  state: MigratableState,
): MigratedState {
  const logs = Array.isArray(state.logs)
    ? state.logs.map((value) => {
        if (typeof value !== "object" || value === null) return value;

        const log = value as Record<string, unknown>;
        return {
          ...log,
          status:
            log.status === "inbox" ||
            log.status === "scheduled" ||
            log.status === "done"
              ? log.status
              : "inbox",
        };
      })
    : state.logs;

  return {
    ...state,
    logs,
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
    return migrateStateV2ToV3(
      migrateStateV1ToV2(
        state,
        getAnchorWeekStart(referenceDate),
      ),
    );
  }
  if (schemaVersion === DATE_SCHEMA_VERSION) {
    return migrateStateV2ToV3(state);
  }
  if (schemaVersion !== CURRENT_SCHEMA_VERSION) return null;

  // TODO: schemaVersionが増えた際に段階的なMigration処理を追加する。
  return {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

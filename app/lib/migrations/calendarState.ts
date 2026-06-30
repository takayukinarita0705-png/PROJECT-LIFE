export const CURRENT_SCHEMA_VERSION = 1 as const;

export type MigratableState = Record<string, unknown> & {
  schemaVersion?: unknown;
};

export function migrateState<T extends MigratableState>(
  state: T,
): (T & { schemaVersion: typeof CURRENT_SCHEMA_VERSION }) | null {
  const schemaVersion = state.schemaVersion ?? CURRENT_SCHEMA_VERSION;
  if (schemaVersion !== CURRENT_SCHEMA_VERSION) return null;

  // TODO: schemaVersionが増えた際に段階的なMigration処理を追加する。
  return {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

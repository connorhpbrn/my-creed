import type { CreedState } from "@creed/core/creed-data";

type PersistedSection = {
  section_id: string;
  revision: number;
  position: number;
  agent_permission?: string | null;
  archived_at?: string | null;
};

export function sectionBaseline(rows: PersistedSection[]) {
  return Object.fromEntries(rows.map((row) => [row.section_id, {
    revision: row.revision,
    position: row.position,
    permission: row.agent_permission ?? null,
    archived: Boolean(row.archived_at),
  }]));
}

export class PersistenceConflict extends Error {
  constructor() {
    super("This Creed changed elsewhere. Your local changes are retained.");
    this.name = "PersistenceConflict";
  }
}

export type PersistenceBaseline = NonNullable<CreedState["persistenceBaseline"]>;

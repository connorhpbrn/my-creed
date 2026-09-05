import { ACCENT_KEYS, type CreedState } from "@creed/core/creed-data";

const MAX_STRING = 50_000;
const MAX_SHORT_STRING = 2_000;
const MAX_ARRAY = 5_000;
const MAX_SECTIONS = 200;
const MAX_SECTION_BODY = 100_000;
const AGENT_PERMISSIONS = new Set(["hidden", "read-only", "propose", "direct"]);
const ACCENTS = new Set<string>(ACCENT_KEYS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

function isBoundedString(value: unknown, max = MAX_STRING): boolean {
  return typeof value === "string" && value.length <= max;
}

function isBoundedArray(value: unknown, max = MAX_ARRAY): boolean {
  return Array.isArray(value) && value.length <= max;
}

function isOptionalString(value: unknown, max = MAX_SHORT_STRING) {
  return value === undefined || isBoundedString(value, max);
}

function validDraft(draft: Record<string, unknown>): boolean {
  if (!["rich-text", "new-section", "delete-section", "rename-section", "recolor-section", "reorder-section"].includes(String(draft.kind))) return false;
  if (!isOptionalString(draft.contentHtml, MAX_SECTION_BODY) || !isOptionalString(draft.contentMarkdown, MAX_SECTION_BODY)) return false;
  if ((draft.kind === "new-section" || draft.kind === "rename-section") && !isBoundedString(draft.name, MAX_SHORT_STRING)) return false;
  if (draft.kind === "recolor-section" && !ACCENTS.has(String(draft.accent))) return false;
  if (draft.accent !== undefined && !ACCENTS.has(String(draft.accent))) return false;
  return isOptionalString(draft.insertAfterSectionId) && isOptionalString(draft.afterSectionId) &&
    (draft.position === undefined || draft.position === "first" || draft.position === "last");
}

export type CreedPersistenceState = Pick<CreedState,
  "creedId" | "sections" | "proposals" | "activity" | "persistenceBaseline" | "persistenceSettingsBaseline"
> & { settings: Pick<CreedState["settings"], "requireApproval" | "versionControl"> };

export function persistenceRequest(state: CreedState): CreedPersistenceState {
  return { creedId: state.creedId, sections: state.sections, proposals: state.proposals, activity: state.activity,
    persistenceBaseline: state.persistenceBaseline, persistenceSettingsBaseline: state.persistenceSettingsBaseline,
    settings: { requireApproval: state.settings.requireApproval, versionControl: state.settings.versionControl } };
}

export type CreedStateValidationResult =
  | { ok: true; data: CreedPersistenceState }
  | { ok: false; error: string };

export function validateCreedState(input: unknown): CreedStateValidationResult {
  if (!isPlainObject(input)) {
    return { ok: false, error: "state must be an object" };
  }

  if (typeof input.creedId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.creedId)) {
    return { ok: false, error: "state.creedId must identify a Creed" };
  }
  if (!isPlainObject(input.persistenceBaseline) || Object.keys(input.persistenceBaseline).length > MAX_SECTIONS ||
    !Object.values(input.persistenceBaseline).every((entry) => isPlainObject(entry) &&
      Number.isSafeInteger(entry.revision) && Number(entry.revision) >= 0 &&
      Number.isSafeInteger(entry.position) && typeof entry.archived === "boolean" &&
      (entry.permission === null || AGENT_PERMISSIONS.has(String(entry.permission))))) {
    return { ok: false, error: "state.persistenceBaseline is invalid" };
  }
  const arrayKeys: Array<keyof CreedPersistenceState> = [
    "sections",
    "proposals",
    "activity",
  ];

  for (const key of arrayKeys) {
    const max = key === "sections" ? MAX_SECTIONS : MAX_ARRAY;
    if (!isBoundedArray(input[key as string], max)) {
      return { ok: false, error: `state.${String(key)} must be a bounded array` };
    }
  }

  const sections = input.sections as unknown[];
  for (const section of sections) {
    if (
      !isPlainObject(section) ||
      section.kind !== "rich-text" ||
      !["identity", "stack", "principles", "focus", "projects", "freeform"].includes(String(section.template)) ||
      !isBoundedString(section.lastEditedBy, MAX_SHORT_STRING) ||
      !isBoundedString(section.lastEditedLabel, MAX_SHORT_STRING) ||
      !["user", "agent"].includes(String(section.lastEditedType)) ||
      (section.archived !== undefined && typeof section.archived !== "boolean") ||
      !isBoundedString(section.id, MAX_SHORT_STRING) ||
      !isBoundedString(section.name, MAX_SHORT_STRING) ||
      !isBoundedString(section.content, MAX_SECTION_BODY) ||
      !ACCENTS.has(String(section.accent)) ||
      !AGENT_PERMISSIONS.has(String(section.agentPermission)) ||
      typeof section.agentWritable !== "boolean"
    ) {
      return { ok: false, error: "state.sections contains an invalid section" };
    }
    const permissionShouldBeWritable =
      section.agentPermission === "propose" || section.agentPermission === "direct";
    if (section.agentWritable !== permissionShouldBeWritable) {
      return { ok: false, error: "state.sections contains an inconsistent permission" };
    }
  }

  if (!isPlainObject(input.settings)) {
    return { ok: false, error: "state.settings must be an object" };
  }

  const settings = input.settings;
  const versionControl = settings.versionControl;
  if (typeof settings.requireApproval !== "boolean" || !isPlainObject(versionControl) ||
    versionControl.provider !== "github" || versionControl.path !== "creed.md" ||
    !["repoOwner", "repoName", "branch"].every((key) => isBoundedString(versionControl[key], MAX_SHORT_STRING)) ||
    !["lastRemoteSha", "lastRemoteMessage", "lastRemoteCommittedAt", "lastSyncedContentHash"].every((key) => isOptionalString(versionControl[key])) ||
    !["not-configured", "unknown", "up-to-date", "local-ahead", "remote-ahead", "diverged"].includes(String(versionControl.syncStatus))) {
    return { ok: false, error: "state.settings has invalid fields" };
  }
  for (const key of ["proposals", "activity"] as const) {
    const entries = input[key] as unknown[];
    const required = key === "proposals"
      ? ["id", "sectionId", "sectionName", "agentName", "reason", "impact", "confidence", "changeType"]
      : ["id", "sectionId", "sectionName", "actor", "summary", "reason", "impact", "confidence", "changeType", "afterText"];
    for (const entry of entries) {
      if (!isPlainObject(entry) || !required.every((field) => isBoundedString(entry[field])) ||
        !ACCENTS.has(String(entry.accent)) ||
        !["pending", "accepted", "rejected", "stale", ...(key === "activity" ? ["direct"] : [])].includes(String(entry.status)) ||
        !isOptionalString(entry.createdAt) || !isOptionalString(entry.proposalId) ||
        !isOptionalString(entry.beforeText, MAX_SECTION_BODY) ||
        (key === "activity" && !["user", "agent"].includes(String(entry.actorType))) ||
        (key === "proposals" && (!isPlainObject(entry.draft) ||
          !validDraft(entry.draft) || JSON.stringify(entry.draft).length > MAX_SECTION_BODY ||
          (entry.baseRevision != null && (!Number.isSafeInteger(entry.baseRevision) || Number(entry.baseRevision) < 0))))) {
        return { ok: false, error: `state.${key} contains invalid fields` };
      }
    }
    if (new Set(entries.map((entry) => (entry as Record<string, unknown>).id)).size !== entries.length) {
      return { ok: false, error: `state.${key} contains duplicate IDs` };
    }
  }
  if (new Set(sections.map((section) => (section as Record<string, unknown>).id)).size !== sections.length) {
    return { ok: false, error: "state.sections contains duplicate IDs" };
  }

  return { ok: true, data: input as unknown as CreedPersistenceState };
}

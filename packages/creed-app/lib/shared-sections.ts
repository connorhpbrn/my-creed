import { databaseJson } from "@creed/persistence/supabase/json";
import { applyPersonalProposal } from "@/lib/personal-proposal-review";
import { loadCreedState, persistCreedState } from "@/lib/creed-backend";
import { sectionBaseline, PersistenceConflict } from "@/lib/persistence-baseline";
import "server-only";
import { randomBytes } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@creed/persistence/supabase/admin";
import type { SupabaseLikeClient } from "@creed/persistence/supabase/types";
import { getCreedRole } from "@/lib/creed-membership";
import {
  resolveSectionPermission,
  canApproveProposal,
  canManageSectionsLifecycle,
  minPermission,
  type CreedRole,
} from "@creed/core/creed-permissions";
import {
  type AgentPermission,
} from "@creed/core/creed-data";
import { actorLabel } from "@/lib/creed-attribution";
import { getDisplayName } from "@/lib/user-name";
import {
  removeSectionReferences,
  richTextContentEquivalent,
} from "@creed/core/rich-text";

// Personal proposal review and Shared section writes. Callers resolve membership
// and effective permissions before invoking the server-only transactional writes.

export type SectionWriteError = {
  ok: false;
  code:
    | "forbidden"
    | "conflict"
    | "not_found"
    | "exists"
    | "failed"
    | "stale";
  error: string;
  currentRevision?: number;
};
export type SectionWriteOk = {
  ok: true;
  revision: number;
  filedProposal?: boolean;
  // Set when a proposal was filed, so callers (e.g. the panel agent) can link
  // the result card to the pending proposal.
  proposalId?: string;
  // Set by proposal accepts so the client can reconcile the affected section
  // from the response instead of refetching the whole Creed state.
  sectionId?: string;
  sectionName?: string;
  accent?: string;
  contentHtml?: string;
};
export type SectionWriteResult = SectionWriteOk | SectionWriteError;

/** Result of creating a section: the resolved id + metadata on success. */
export type SectionCreateResult =
  | { ok: true; sectionId: string; revision: number; name: string; accent: string }
  | SectionWriteError;

function admin(): SupabaseLikeClient {
  return getSupabaseAdminClient() as unknown as SupabaseLikeClient;
}

function memberName(user: User): string {
  return getDisplayName(user, "Someone");
}

type ActorType = "user" | "agent";
type WriteCause =
  | "manual"
  | "mcp"
  | "proposal"
  | "import"
  | "onboarding"
  | "restore";

type Actor = {
  userId: string;
  actorType: ActorType;
  // The connected agent's name for agent actions, null for human actions.
  agentName: string | null;
  // The rendered attribution: "Fergus" (human) or "Fergus's Claude Code" (agent).
  label: string;
};

/**
 * Resolve the attribution for a write. A non-null `agentName` marks an agent
 * action; otherwise it is a human action. Mirrors lib/creed-attribution so the
 * activity drawer, version rows, and proposal list all agree.
 */
function describeActor(user: User, agentName: string | null): Actor {
  const name = agentName?.trim() || null;
  const isAgent = Boolean(name);
  return {
    userId: user.id,
    actorType: isAgent ? "agent" : "user",
    agentName: isAgent ? name : null,
    label: actorLabel({
      actorType: isAgent ? "agent" : "user",
      userName: memberName(user),
      agentName: name,
    }),
  };
}

/**
 * The caller's effective permission on a section. Owner/admin resolve to Direct;
 * a member gets their per-section override (or Direct by default). When acting
 * as an agent, the result is capped again by the member's own per-section agent
 * ceiling (creed_member_agent_permissions; no row = "propose"). That table is
 * stored unclamped, so the min here is what actually holds - an agent can never
 * exceed its member (non-negotiable #9).
 */
async function effectivePermission(
  creedId: string,
  userId: string,
  sectionId: string,
  role: CreedRole,
  asAgent: boolean,
): Promise<AgentPermission> {
  const db = admin();
  const memberPermissionPromise = role === "owner" || role === "admin"
    ? Promise.resolve({ data: null })
    : db
      .from("creed_member_section_permissions")
      .select("permission")
      .eq("creed_id", creedId)
      .eq("user_id", userId)
      .eq("section_id", sectionId)
      .maybeSingle();
  const agentPermissionPromise = asAgent
    ? db
        .from("creed_member_agent_permissions")
        .select("permission")
        .eq("creed_id", creedId)
        .eq("user_id", userId)
        .eq("section_id", sectionId)
        .maybeSingle()
    : Promise.resolve({ data: null });
  const [{ data: memberRow }, { data: agentRow }] = await Promise.all([
    memberPermissionPromise,
    agentPermissionPromise,
  ]) as [
    { data: { permission: AgentPermission } | null },
    { data: { permission: AgentPermission } | null },
  ];
  const ceiling = resolveSectionPermission(role, memberRow?.permission);
  if (!asAgent) return ceiling;
  return minPermission(ceiling, agentRow?.permission ?? "propose");
}

type ActivityWrite = {
  creedId: string;
  sectionId: string | null;
  sectionName: string | null;
  accent: string | null;
  actorUserId: string;
  actorType: ActorType;
  actorName: string;
  summary: string;
  status: string;
  eventKind: string;
  // Links the activity row to a live proposal so the sidebar renders it as the
  // pending proposal (pending rows without a link are filtered out).
  proposalId?: string | null;
  beforeText?: string | null;
  afterText?: string | null;
};

async function writeActivity(params: ActivityWrite): Promise<void> {
  const db = admin();
  const { error } = await db.from("creed_activity").insert({
    id: randomBytes(16).toString("hex"),
    creed_id: params.creedId,
    user_id: params.actorUserId,
    actor_user_id: params.actorUserId,
    proposal_id: params.proposalId ?? null,
    section_id: params.sectionId,
    section_name: params.sectionName,
    accent: params.accent,
    actor: params.actorName,
    actor_type: params.actorType,
    summary: params.summary,
    status: params.status,
    event_kind: params.eventKind,
    after_text: params.afterText ?? null,
    before_text: params.beforeText ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
}

type SectionRow = {
  section_id: string;
  kind: string;
  name: string;
  accent: string;
  payload: { content?: string } & Record<string, unknown>;
  revision: number;
};

// Draft vocabulary + application. A change to a Shared Creed - whether applied
// directly or via an accepted proposal - is one of these four drafts, stored
// verbatim in creed_proposals.draft (jsonb). rich-text carries any of content /
// name / accent so a content edit, rename, and recolour share one path.

export type SharedDraft =
  | { kind: "rich-text"; contentHtml?: string; name?: string; accent?: string }
  | {
      kind: "new-section";
      name: string;
      contentHtml: string;
      accent?: string;
      insertAfterSectionId?: string | null;
    }
  | { kind: "delete-section" }
  | {
      kind: "reorder-section";
      afterSectionId?: string | null;
      position?: "first" | "last";
    };

type ApplyResult =
  | {
      ok: true;
      sectionId: string;
      sectionName: string;
      accent: string;
      revision: number;
      before: string;
      after: string;
      noop?: boolean;
    }
  | { ok: false; code: "not_found" | "failed" | "conflict"; error: string; currentRevision?: number };

/** Rewrite every listed section's position to its index (0..N-1). */
async function renumberSections(
  creedId: string,
  orderedIds: string[],
  now: string,
): Promise<void> {
  const db = admin();
  const { error } = await db.rpc("update_creed_section_positions", {
    p_creed_id: creedId,
    p_section_ids: orderedIds,
    p_updated_at: now,
  });
  if (error) throw new Error(error.message);
}

/** Move `target` within `ids` to just after `afterId`, or to first/last. */
function moveInOrder(
  ids: string[],
  target: string,
  afterId: string | null | undefined,
  position: "first" | "last" | undefined,
): string[] {
  const without = ids.filter((id) => id !== target);
  if (position === "first") return [target, ...without];
  if (position === "last") return [...without, target];
  const anchorIndex = afterId ? without.indexOf(afterId) : -1;
  if (anchorIndex === -1) return [...without, target];
  const out = [...without];
  out.splice(anchorIndex + 1, 0, target);
  return out;
}

/**
 * Apply a draft to the canonical section rows and record a version. Shared by
 * the direct-write path (sharedMcpWrite / updateSharedSection) and proposal
 * acceptance (reviewSharedProposal), so both mutate the file identically. It
 * does NOT write the activity row: the summary/status differ between a direct
 * edit ("edited X") and an accept ("accepted an edit to X"), so each caller logs
 * its own, using the metadata returned here.
 */
async function applyDraft(params: {
  creedId: string;
  sectionId: string | null;
  draft: SharedDraft;
  actor: Actor;
  cause: WriteCause;
  expectedRevision?: number | null;
  proposalId?: string;
  activity?: (result: Extract<ApplyResult, { ok: true }>) => ActivityWrite;
}): Promise<ApplyResult> {
  const { creedId, draft, actor, cause } = params;
  const db = admin();
  const { data, error: loadError } = await db.from("creed_sections")
    .select("section_id, kind, name, accent, payload, revision, position, agent_permission, archived_at, deleted_at")
    .eq("creed_id", creedId);
  if (loadError) return { ok: false, code: "failed", error: "Could not load sections." };
  const rows = (data ?? []) as Array<SectionRow & {
    position: number; agent_permission: string; archived_at: string | null; deleted_at: string | null;
  }>;
  const sectionId = params.sectionId ?? `section-${randomBytes(8).toString("hex")}`;
  const current = rows.find((row) => row.section_id === sectionId);
  if (draft.kind !== "new-section" && !current) return { ok: false, code: "not_found", error: "Section not found." };
  if (draft.kind === "new-section" && current) return { ok: false, code: "conflict", error: "Section already exists." };
  if (current && params.expectedRevision != null && current.revision !== params.expectedRevision) {
    return { ok: false, code: "conflict", error: "This section changed while you were editing.", currentRevision: current.revision };
  }
  const now = new Date().toISOString();
  const before = current?.payload.content ?? "";
  const name = draft.kind === "new-section" ? draft.name.trim() : draft.kind === "rich-text" ? draft.name?.trim() || current!.name : current!.name;
  const accent = draft.kind === "new-section" || draft.kind === "rich-text" ? draft.accent ?? current?.accent ?? "stack" : current!.accent;
  const content = draft.kind === "new-section" || draft.kind === "rich-text" ? draft.contentHtml ?? before : draft.kind === "delete-section" ? "" : before;
  const noop = draft.kind === "rich-text" && richTextContentEquivalent(content, before) && name === current!.name && accent === current!.accent;
  const revision = noop || draft.kind === "delete-section" || draft.kind === "reorder-section" ? current!.revision : (current?.revision ?? 0) + 1;
  const result: Extract<ApplyResult, { ok: true }> = { ok: true, sectionId, sectionName: name, accent, revision, before, after: content, ...(noop ? { noop: true } : {}) };
  const changes: Array<Record<string, unknown>> = [];
  let order = rows.filter((row) => !row.deleted_at).sort((a, b) => a.position - b.position).map((row) => row.section_id);
  if (draft.kind === "new-section") order = moveInOrder(order, sectionId, draft.insertAfterSectionId, undefined);
  if (draft.kind === "reorder-section") {
    order = moveInOrder(order, sectionId, draft.afterSectionId, draft.position);
    result.before = `Keep ${name} in place`;
    const destination = draft.position === "first" ? "top of file" : draft.position === "last" ? "bottom of file" : draft.afterSectionId ? `after ${draft.afterSectionId}` : "bottom of file";
    result.after = `Move ${name} to ${destination}`;
  }
  if (!noop && (draft.kind === "new-section" || draft.kind === "rich-text")) changes.push({
    creed_id: creedId, user_id: actor.userId, section_id: sectionId,
    kind: current?.kind ?? "rich-text", name, accent, payload: { ...current?.payload, content }, revision,
    position: current?.position ?? 0, agent_permission: current?.agent_permission ?? "propose",
    last_edited_by: actor.label, last_edited_type: actor.actorType, last_edited_at: now, updated_at: now,
  });
  if (draft.kind === "delete-section") {
    for (const row of rows) {
      if (row.section_id === sectionId || row.deleted_at) continue;
      const cleaned = removeSectionReferences(row.payload.content ?? "", { id: sectionId, name });
      if (cleaned === (row.payload.content ?? "")) continue;
      changes.push({ creed_id: creedId, user_id: actor.userId, section_id: row.section_id,
        kind: row.kind, name: row.name, accent: row.accent, position: row.position,
        agent_permission: row.agent_permission, payload: { ...row.payload, content: cleaned }, revision: row.revision + 1,
        last_edited_by: actor.label, last_edited_type: actor.actorType, last_edited_at: now, updated_at: now });
    }
  }
  const activity = !noop ? params.activity?.(result) : undefined;
  const { error } = await db.rpc("commit_creed_section_batch", {
    p_creed_id: creedId, p_expected: sectionBaseline(rows), p_sections: databaseJson(changes),
    p_remove: draft.kind === "delete-section" ? [sectionId] : null,
    p_order: draft.kind === "new-section" || draft.kind === "reorder-section" ? order : null,
    p_proposal_id: params.proposalId ?? null,
    p_actor: { userId: actor.userId, type: actor.actorType, agentName: actor.agentName, cause, proposalDraft: params.proposalId ? draft : null },
    p_activity: activity ? {
      id: randomBytes(16).toString("hex"), creed_id: creedId, user_id: activity.actorUserId,
      actor_user_id: activity.actorUserId, section_id: activity.sectionId, section_name: activity.sectionName,
      accent: activity.accent, actor: activity.actorName, actor_type: activity.actorType,
      summary: activity.summary, status: activity.status, event_kind: activity.eventKind,
      before_text: activity.beforeText ?? null, after_text: activity.afterText ?? null,
    } : null,
  });
  if (error) return { ok: false, code: error.message.includes("creed_write_conflict") ? "conflict" : "failed", error: "Could not save the section. Your draft is retained." };
  return result;
}

// Bookkeeping defaults for a proposal, per draft kind (mirrors the personal
// proposals route). These drive the activity sidebar's labelling only.
const PROPOSAL_DEFAULTS: Record<
  SharedDraft["kind"],
  { changeType: string; impact: string; confidence: string }
> = {
  "rich-text": { changeType: "refines-existing", impact: "future-responses", confidence: "repeated" },
  "new-section": { changeType: "new-memory", impact: "future-responses", confidence: "durable" },
  "delete-section": { changeType: "refines-existing", impact: "future-responses", confidence: "durable" },
  "reorder-section": { changeType: "refines-existing", impact: "future-responses", confidence: "durable" },
};

/**
 * File a proposal for a change the caller may not (or chose not to) apply
 * directly, plus a linked pending activity row. Owner/Admin (or a member with
 * Direct edit on the section) later accept it via reviewSharedProposal.
 */
async function fileSharedProposal(params: {
  creedId: string;
  user: User;
  agentName: string | null;
  // The target section id, or "new-section" for a new-section draft.
  sectionId: string;
  sectionName: string;
  accent: string;
  draft: SharedDraft;
  reason: string;
}): Promise<string> {
  const db = admin();
  const actor = describeActor(params.user, params.agentName);
  const proposalId = randomBytes(16).toString("hex");
  const isNew = params.sectionId === "new-section";

  // Pull the current section (existing-section proposals) so the activity diff
  // is proportional and base_revision pins the point the change was drafted at.
  let baseRevision: number | null = null;
  let currentContent = "";
  let currentName = params.sectionName;
  let currentAccent = params.accent;
  if (!isNew) {
    const { data } = (await db
      .from("creed_sections")
      .select("name, accent, payload, revision")
      .eq("creed_id", params.creedId)
      .eq("section_id", params.sectionId)
      .maybeSingle()) as {
      data: { name: string; accent: string; payload: { content?: string }; revision: number } | null;
    };
    if (data) {
      baseRevision = data.revision;
      currentContent = data.payload.content ?? "";
      currentName = data.name;
      currentAccent = data.accent;
    }
  }

  const { before, after, summary } = describeProposal(params.draft, actor.label, {
    sectionName: params.sectionName,
    content: currentContent,
    name: currentName,
    accent: currentAccent,
  });
  const defaults = PROPOSAL_DEFAULTS[params.draft.kind];

  const { error: proposalInsertError } = await db.from("creed_proposals").insert({
    id: proposalId,
    creed_id: params.creedId,
    user_id: params.user.id,
    // author_user_id marks a human proposal (the UI shows the person's avatar and
    // lets them edit/withdraw it). An agent proposal leaves it null and carries
    // the full "[member]'s [agent]" attribution in agent_name, so it renders as
    // an agent proposal - exactly like the personal Creed.
    author_user_id: actor.actorType === "agent" ? null : params.user.id,
    section_id: params.sectionId,
    section_name: params.sectionName,
    accent: params.accent,
    agent_name: actor.label,
    change_type: defaults.changeType,
    reason: params.reason,
    impact: defaults.impact,
    confidence: defaults.confidence,
    draft: params.draft,
    status: "pending",
    base_revision: baseRevision,
  });
  // Fail loud: writeActivity below references this proposal, so a swallowed
  // insert error would leave a dangling activity row and report success.
  if (proposalInsertError) {
    throw new Error(proposalInsertError.message);
  }
  await writeActivity({
    creedId: params.creedId,
    proposalId,
    sectionId: isNew ? null : params.sectionId,
    sectionName: params.sectionName,
    accent: params.accent,
    actorUserId: params.user.id,
    actorType: actor.actorType,
    actorName: actor.label,
    summary,
    status: "pending",
    eventKind: "proposal",
    beforeText: before,
    afterText: after,
  });
  return proposalId;
}

/** Proportional diff labels + a summary line for a proposed change. */
function describeProposal(
  draft: SharedDraft,
  actorLabelText: string,
  current: { sectionName: string; content: string; name: string; accent: string },
): { before: string; after: string; summary: string } {
  const target = current.sectionName;
  if (draft.kind === "new-section") {
    return {
      before: "",
      after: draft.contentHtml,
      summary: `${actorLabelText} proposed a new section: ${draft.name}`,
    };
  }
  if (draft.kind === "delete-section") {
    return {
      before: current.content,
      after: "",
      summary: `${actorLabelText} proposed deleting ${target}`,
    };
  }
  if (draft.kind === "reorder-section") {
    return {
      before: `Keep ${target} in place`,
      after: `Move ${target}`,
      summary: `${actorLabelText} proposed moving ${target}`,
    };
  }
  // rich-text: content, rename, or recolour.
  if (draft.contentHtml === undefined && draft.name) {
    return {
      before: `Name: ${current.name}`,
      after: `Name: ${draft.name}`,
      summary: `${actorLabelText} proposed renaming ${target}`,
    };
  }
  if (draft.contentHtml === undefined && draft.accent) {
    return {
      before: `Accent: ${current.accent}`,
      after: `Accent: ${draft.accent}`,
      summary: `${actorLabelText} proposed recolouring ${target}`,
    };
  }
  return {
    before: current.content,
    after: draft.contentHtml ?? current.content,
    summary: `${actorLabelText} proposed an edit to ${target}`,
  };
}

// Public write functions.

/**
 * Create a section on a Shared Creed from the app (human). Creating a section
 * is a structural change reserved to owner/admin, mirroring the MCP create
 * governance and the in-app affordance gate (canCreateSections). Accepts an
 * optional client-generated id so the provider's optimistic row and the server
 * row share an id; rejects a taken id so the new-section upsert can never
 * clobber an existing section.
 */
export async function createSharedSection(params: {
  creedId: string;
  user: User;
  name: string;
  contentHtml?: string;
  accent?: string;
  insertAfterSectionId?: string | null;
  sectionId?: string;
}): Promise<SectionCreateResult> {
  const { creedId, user } = params;
  const db = admin();

  const role = await getCreedRole(db, user.id, creedId);
  if (!role)
    return { ok: false, code: "forbidden", error: "You are not a member of this Creed." };
  if (role !== "owner" && role !== "admin") {
    return { ok: false, code: "forbidden", error: "Only an owner or admin can add sections." };
  }

  const name = params.name.trim();
  if (!name) return { ok: false, code: "failed", error: "A section needs a name." };

  let sectionId: string | null = null;
  if (params.sectionId !== undefined) {
    if (!/^section-[0-9a-f]{16}$/.test(params.sectionId)) {
      return { ok: false, code: "failed", error: "Invalid section id." };
    }
    const { data: clash } = (await db
      .from("creed_sections")
      .select("section_id")
      .eq("creed_id", creedId)
      .eq("section_id", params.sectionId)
      .maybeSingle()) as { data: { section_id: string } | null };
    if (clash) return { ok: false, code: "exists", error: "That section already exists." };
    sectionId = params.sectionId;
  }

  const actor = describeActor(user, null);
  const draft: SharedDraft = {
    kind: "new-section",
    name,
    contentHtml: params.contentHtml ?? "",
    accent: params.accent,
    insertAfterSectionId: params.insertAfterSectionId ?? null,
  };
  const applied = await applyDraft({ creedId, sectionId, draft, actor, cause: "manual", activity: (applied) => ({
    creedId,
    sectionId: applied.sectionId,
    sectionName: applied.sectionName,
    accent: applied.accent,
    actorUserId: user.id,
    actorType: actor.actorType,
    actorName: actor.label,
    summary: `${actor.label} added ${applied.sectionName}`,
    status: "direct",
    eventKind: "edit",
    beforeText: applied.before,
    afterText: applied.after,
  })});
  if (!applied.ok) return applied;

  
  return {
    ok: true,
    sectionId: applied.sectionId,
    revision: applied.revision,
    name: applied.sectionName,
    accent: applied.accent,
  };
}

/**
 * Update a shared section's content / name / accent from the app (human edit).
 * Owner/admin and members with Direct edit write immediately; members with
 * Proposal-only file a proposal instead. baseRevision guards a concurrent write
 * (409). Agent edits go through sharedMcpWrite, not this.
 */
export async function updateSharedSection(params: {
  creedId: string;
  user: User;
  sectionId: string;
  baseRevision: number;
  content?: string;
  name?: string;
  accent?: string;
}): Promise<SectionWriteResult> {
  const { creedId, user, sectionId } = params;
  const db = admin();

  const [role, currentResult] = await Promise.all([
    getCreedRole(db, user.id, creedId),
    db
      .from("creed_sections")
      .select("section_id, name, accent, payload, revision")
      .eq("creed_id", creedId)
      .eq("section_id", sectionId)
      .maybeSingle(),
  ]);
  if (!role)
    return { ok: false, code: "forbidden", error: "You are not a member of this Creed." };

  const permission = await effectivePermission(creedId, user.id, sectionId, role, false);
  if (permission === "hidden" || permission === "read-only") {
    return { ok: false, code: "forbidden", error: "You cannot edit this section." };
  }

  const current = currentResult.data as {
    section_id: string;
    name: string;
    accent: string;
    payload: { content?: string };
    revision: number;
  } | null;
  if (!current) return { ok: false, code: "not_found", error: "Section not found." };

  if (params.baseRevision !== current.revision) {
    return {
      ok: false,
      code: "conflict",
      error: "This section changed while you were editing.",
      currentRevision: current.revision,
    };
  }

  // Only carry the fields that actually changed into the draft, so a rename /
  // recolour reads as such. Content is compared whitespace-insensitively, so a
  // save that added nothing but a stray space (or an &nbsp;) doesn't count as a
  // content change - it must never land an edit, version, proposal, or activity
  // row that says someone edited the section when they didn't.
  const contentChanged =
    params.content !== undefined &&
    !richTextContentEquivalent(params.content, current.payload.content ?? "");
  const nameChanged = params.name !== undefined && params.name !== current.name;
  const accentChanged = params.accent !== undefined && params.accent !== current.accent;

  if (!contentChanged && !nameChanged && !accentChanged) {
    return { ok: true, revision: current.revision };
  }

  const draft: SharedDraft = {
    kind: "rich-text",
    ...(contentChanged ? { contentHtml: params.content } : {}),
    ...(nameChanged ? { name: params.name } : {}),
    ...(accentChanged ? { accent: params.accent } : {}),
  };

  if (permission === "propose") {
    const proposalId = await fileSharedProposal({
      creedId,
      user,
      agentName: null,
      sectionId,
      sectionName: params.name ?? current.name,
      accent: params.accent ?? current.accent,
      draft,
      reason: "Suggested edit.",
    });
    return { ok: true, revision: current.revision, filedProposal: true, proposalId };
  }

  // Name the operation so a rename/recolour doesn't read as a contentless edit.
  const verb =
    !contentChanged && nameChanged && !accentChanged
      ? "renamed"
      : !contentChanged && accentChanged && !nameChanged
        ? "recoloured"
        : "edited";
  const actor = describeActor(user, null);
  const applied = await applyDraft({ creedId, sectionId, draft, actor, cause: "manual", expectedRevision: params.baseRevision, activity: (applied) => ({
    creedId,
    sectionId,
    sectionName: applied.sectionName,
    accent: applied.accent,
    actorUserId: user.id,
    actorType: actor.actorType,
    actorName: actor.label,
    summary: `${actor.label} ${verb} ${applied.sectionName}`,
    status: "direct",
    eventKind: "edit",
    beforeText: applied.before,
    afterText: applied.after,
  })});
  if (!applied.ok) return applied;
  if (applied.noop) return { ok: true, revision: applied.revision };

  return { ok: true, revision: applied.revision };
}

export type SharedMcpOp =
  | { kind: "update"; sectionId: string; contentHtml: string }
  | { kind: "append"; sectionId: string; contentHtml: string }
  | { kind: "rename"; sectionId: string; name: string }
  | { kind: "recolor"; sectionId: string; accent: string }
  | { kind: "delete"; sectionId: string }
  | { kind: "reorder"; sectionId: string; afterSectionId?: string; position?: "first" | "last" }
  | {
      kind: "create";
      name: string;
      contentHtml: string;
      accent?: string;
      insertAfterSectionId?: string;
    };

/**
 * The single write entry for a connected agent on a Shared Creed. Enforces the
 * effective agent permission per section (Direct applies immediately, Proposal
 * files a proposal, Read-only / Hidden are rejected) with agent attribution.
 * Creating a section is structural, so owner/admin create directly while members
 * propose - there is no existing section whose permission would gate it.
 */
export async function sharedMcpWrite(params: {
  creedId: string;
  user: User;
  agentName: string;
  op: SharedMcpOp;
}): Promise<SectionWriteResult> {
  const { creedId, user, op } = params;
  const db = admin();

  const sectionId = op.kind === "create" ? null : op.sectionId;
  const [role, currentResult] = await Promise.all([
    getCreedRole(db, user.id, creedId),
    sectionId
      ? db
          .from("creed_sections")
          .select("section_id, name, accent, payload, revision")
          .eq("creed_id", creedId)
          .eq("section_id", sectionId)
          .is("deleted_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (!role)
    return { ok: false, code: "forbidden", error: "You are not a member of this Creed." };

  const actor = describeActor(user, params.agentName);

  if (op.kind === "create") {
    const draft: SharedDraft = {
      kind: "new-section",
      name: op.name,
      contentHtml: op.contentHtml,
      accent: op.accent,
      insertAfterSectionId: op.insertAfterSectionId ?? null,
    };
    if (role === "owner" || role === "admin") {
      const applied = await applyDraft({ creedId, sectionId: null, draft, actor, cause: "mcp", activity: (applied) => ({
        creedId,
        sectionId: applied.sectionId,
        sectionName: applied.sectionName,
        accent: applied.accent,
        actorUserId: user.id,
        actorType: actor.actorType,
        actorName: actor.label,
        summary: `${actor.label} created ${applied.sectionName}`,
        status: "direct",
        eventKind: "edit",
        beforeText: applied.before,
        afterText: applied.after,
      })});
      if (!applied.ok) return applied;
      
      return { ok: true, revision: applied.revision };
    }
    const proposalId = await fileSharedProposal({
      creedId,
      user,
      agentName: actor.agentName,
      sectionId: "new-section",
      sectionName: op.name,
      accent: op.accent ?? "stack",
      draft,
      reason: "Captured useful context that didn't fit an existing section.",
    });
    return { ok: true, revision: 0, filedProposal: true, proposalId };
  }

  const current = currentResult.data as {
    section_id: string;
    name: string;
    accent: string;
    payload: { content?: string };
    revision: number;
  } | null;
  if (!sectionId) return { ok: false, code: "not_found", error: "Section not found." };
  if (!current) return { ok: false, code: "not_found", error: "Section not found." };

  // Deleting or reordering a section is a structural change reserved to owner/
  // admin (mirrors the in-app lifecycle and the spec's "members don't delete
  // sections in V1"). A member's agent can't do it, and there is no delete/
  // reorder approval path, so it's rejected outright rather than filed.
  const isLifecycle = op.kind === "delete" || op.kind === "reorder";
  if (isLifecycle && !canManageSectionsLifecycle(role)) {
    return {
      ok: false,
      code: "forbidden",
      error: `Only an owner or admin can ${op.kind} sections.`,
    };
  }

  const permission = await effectivePermission(creedId, user.id, sectionId, role, true);
  if (permission === "hidden" || permission === "read-only") {
    return {
      ok: false,
      code: "forbidden",
      error: `Section ${sectionId} is read-only - the user hasn't granted agent edits to it.`,
    };
  }

  const draft = draftForOp(op, current.payload.content ?? "");

  // No-op guard: a content edit/append/rename/recolour that changes nothing
  // substantive (e.g. only whitespace) must not file a proposal or land an
  // edit. Structural ops (delete/reorder) always do something.
  if (draft.kind === "rich-text") {
    const contentSame =
      draft.contentHtml === undefined ||
      richTextContentEquivalent(draft.contentHtml, current.payload.content ?? "");
    const nameSame = draft.name === undefined || draft.name === current.name;
    const accentSame = draft.accent === undefined || draft.accent === current.accent;
    if (contentSame && nameSame && accentSame) {
      return { ok: true, revision: current.revision };
    }
  }

  if (permission === "direct") {
    const applied = await applyDraft({ creedId, sectionId, draft, actor, cause: "mcp", expectedRevision: current.revision, activity: (applied) => ({
      creedId,
      sectionId,
      sectionName: applied.sectionName,
      accent: applied.accent,
      actorUserId: user.id,
      actorType: actor.actorType,
      actorName: actor.label,
      summary: directSummary(op, actor.label, applied.sectionName),
      status: "direct",
      eventKind: "edit",
      beforeText: applied.before,
      afterText: applied.after,
    })});
    if (!applied.ok) return applied;
    if (applied.noop) return { ok: true, revision: applied.revision };
    
    return { ok: true, revision: applied.revision };
  }

  // Reaching here means the effective permission is Proposal-only. Lifecycle ops
  // (owner/admin who limited their own agent below Direct on this section) have
  // no proposal path, so reject; everything else files a proposal.
  if (isLifecycle) {
    return {
      ok: false,
      code: "forbidden",
      error: `Your agent is limited to proposing on this section, so it can't ${op.kind} it.`,
    };
  }

  const proposalId = await fileSharedProposal({
    creedId,
    user,
    agentName: actor.agentName,
    sectionId,
    sectionName: current.name,
    accent: current.accent,
    draft,
    reason: reasonForOp(op),
  });
  return { ok: true, revision: current.revision, filedProposal: true, proposalId };
}

/** Translate an agent op into a stored draft. append merges into current body. */
function draftForOp(op: SharedMcpOp, currentContent: string): SharedDraft {
  switch (op.kind) {
    case "update":
      return { kind: "rich-text", contentHtml: op.contentHtml };
    case "append": {
      const existing = currentContent.trim();
      const separator = existing ? `<hr class="creed-hr" />` : "";
      return { kind: "rich-text", contentHtml: `${existing}${separator}${op.contentHtml}` };
    }
    case "rename":
      return { kind: "rich-text", name: op.name };
    case "recolor":
      return { kind: "rich-text", accent: op.accent };
    case "delete":
      return { kind: "delete-section" };
    case "reorder":
      return { kind: "reorder-section", afterSectionId: op.afterSectionId ?? null, position: op.position };
    case "create":
      return {
        kind: "new-section",
        name: op.name,
        contentHtml: op.contentHtml,
        accent: op.accent,
        insertAfterSectionId: op.insertAfterSectionId ?? null,
      };
  }
}

function directSummary(op: SharedMcpOp, label: string, name: string): string {
  switch (op.kind) {
    case "delete":
      return `${label} deleted ${name}`;
    case "reorder":
      return `${label} moved ${name}`;
    case "rename":
      return `${label} renamed a section to ${name}`;
    case "recolor":
      return `${label} recoloured ${name}`;
    default:
      return `${label} edited ${name}`;
  }
}

function reasonForOp(op: SharedMcpOp): string {
  switch (op.kind) {
    case "delete":
      return "Section is no longer useful.";
    case "reorder":
      return "Better-flowing section order.";
    case "rename":
      return "Clearer name.";
    case "recolor":
      return "Better-matching accent.";
    case "append":
      return "Captured new context that adds to the existing section.";
    default:
      return "Captured durable context worth remembering.";
  }
}

/**
 * Archive or restore a shared section (owner/admin). Metadata-only, mirroring
 * the personal semantics exactly: archived_at set once (preserved on re-archive)
 * or cleared, no revision bump, no version row.
 */
export async function setSharedSectionArchived(params: {
  creedId: string;
  user: User;
  sectionId: string;
  archived: boolean;
}): Promise<SectionWriteResult> {
  const { creedId, user, sectionId } = params;
  const db = admin();

  const role = await getCreedRole(db, user.id, creedId);
  if (!role)
    return { ok: false, code: "forbidden", error: "You are not a member of this Creed." };
  if (!canManageSectionsLifecycle(role)) {
    return {
      ok: false,
      code: "forbidden",
      error: "Only the owner or an admin can archive sections.",
    };
  }

  const { data: current } = (await db
    .from("creed_sections")
    .select("section_id, name, accent, revision, archived_at")
    .eq("creed_id", creedId)
    .eq("section_id", sectionId)
    .maybeSingle()) as {
    data: {
      section_id: string;
      name: string;
      accent: string;
      revision: number;
      archived_at: string | null;
    } | null;
  };
  if (!current) return { ok: false, code: "not_found", error: "Section not found." };

  const now = new Date().toISOString();
  const { error } = await db
    .from("creed_sections")
    .update({
      archived_at: params.archived ? (current.archived_at ?? now) : null,
      updated_at: now,
    })
    .eq("creed_id", creedId)
    .eq("section_id", sectionId);
  if (error)
    return { ok: false, code: "failed", error: "Could not update the section." };

  const actorName = memberName(user);
  await writeActivity({
    creedId,
    sectionId,
    sectionName: current.name,
    accent: current.accent,
    actorUserId: user.id,
    actorType: "user",
    actorName,
    summary: `${actorName} ${params.archived ? "archived" : "restored"} ${current.name}`,
    status: "direct",
    eventKind: "edit",
  });

  return { ok: true, revision: current.revision };
}

/**
 * Accept or reject a proposal (owner/admin, or a member with Direct edit),
 * withdraw the author's own pending proposal, or dismiss a stale proposal.
 * On accept the draft is applied to the section rows via the shared applyDraft,
 * so every draft kind (content, rename, recolour, new, delete, reorder) takes
 * effect, not just content.
 */
export async function reviewSharedProposal(params: {
  creedId: string;
  user: User;
  proposalId: string;
  decision: "accept" | "reject" | "withdraw" | "dismiss";
}): Promise<SectionWriteResult> {
  const { creedId, user, proposalId } = params;
  const db = admin();
  const role = await getCreedRole(db, user.id, creedId);
  if (!role)
    return { ok: false, code: "forbidden", error: "You are not a member of this Creed." };

  const { data: proposal } = (await db
    .from("creed_proposals")
    .select(
      "id, section_id, section_name, accent, draft, status, author_user_id, base_revision",
    )
    .eq("creed_id", creedId)
    .eq("id", proposalId)
    .maybeSingle()) as {
    data: {
      id: string;
      section_id: string;
      section_name: string;
      accent: string;
      draft: SharedDraft;
      status: string;
      author_user_id: string | null;
      base_revision: number | null;
    } | null;
  };
  if (!proposal)
    return { ok: false, code: "not_found", error: "Proposal not found." };

  const isWithdraw = params.decision === "withdraw";
  const isDismiss = params.decision === "dismiss";
  if (isWithdraw) {
    // Only the author may withdraw their own proposal (no approval power needed).
    if (proposal.author_user_id !== user.id) {
      return {
        ok: false,
        code: "forbidden",
        error: "You can only delete your own proposal.",
      };
    }
  } else if (isDismiss && proposal.author_user_id === user.id) {
    // Authors may dismiss their own stale proposal without review power.
  } else if (proposal.section_id === "new-section") {
    // A new-section proposal has no existing section to hold a permission on, so
    // effectivePermission would default a member to "direct" and wrongly let them
    // approve. Creating a section is structural: owner/admin only.
    if (role !== "owner" && role !== "admin") {
      return {
        ok: false,
        code: "forbidden",
        error: "Only an owner or admin can approve a new section.",
      };
    }
  } else {
    const permission = await effectivePermission(
      creedId,
      user.id,
      proposal.section_id,
      role,
      false,
    );
    if (!canApproveProposal(role, permission)) {
      return {
        ok: false,
        code: "forbidden",
        error: "You cannot review proposals on this section.",
      };
    }
  }
  if (isDismiss) {
    if (proposal.status !== "stale") {
      return {
        ok: false,
        code: "conflict",
        error: "Only stale proposals can be dismissed.",
      };
    }
    const { error } = await db
      .from("creed_proposals")
      .delete()
      .eq("id", proposalId)
      .eq("creed_id", creedId)
      .eq("status", "stale");
    if (error) {
      return {
        ok: false,
        code: "failed",
        error: "Could not dismiss the proposal.",
      };
    }
    return { ok: true, revision: 0 };
  }

  // Only pending proposals are reviewable: a double-accept (or an accept racing
  // a reject) must not re-apply the draft and double-bump the revision.
  if (proposal.status !== "pending") {
    return {
      ok: false,
      code: "conflict",
      error: "This proposal was already reviewed.",
    };
  }

  const actorName = memberName(user);
  if (params.decision === "reject" || isWithdraw) {
    await db
      .from("creed_proposals")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", proposalId)
      .eq("creed_id", creedId)
      .eq("status", "pending");
    await writeActivity({
      creedId,
      sectionId: proposal.section_id === "new-section" ? null : proposal.section_id,
      sectionName: proposal.section_name,
      accent: proposal.accent,
      actorUserId: user.id,
      actorType: "user",
      actorName,
      summary: isWithdraw
        ? `${actorName} deleted a proposed edit to ${proposal.section_name}`
        : `${actorName} rejected a proposed edit to ${proposal.section_name}`,
      status: "rejected",
      eventKind: "proposal",
    });
    return { ok: true, revision: 0 };
  }

  // Optimistic concurrency for accepts: the proposal was drafted against a
  // specific section revision. If the section has moved on since (a direct
  // edit, another accepted proposal), applying the draft would silently
  // clobber the newer content - the same hazard the direct-edit path guards
  // with baseRevision. Mark the proposal stale (kept for the audit trail,
  // like accepted/rejected) and tell the caller.
  if (
    proposal.draft.kind === "rich-text" &&
    proposal.base_revision != null
  ) {
    const { data: section } = (await db
      .from("creed_sections")
      .select("revision")
      .eq("creed_id", creedId)
      .eq("section_id", proposal.section_id)
      .maybeSingle()) as { data: { revision: number } | null };
    if (section && section.revision !== proposal.base_revision) {
      await db
        .from("creed_proposals")
        .update({ status: "stale", updated_at: new Date().toISOString() })
        .eq("id", proposalId)
        .eq("creed_id", creedId)
        .eq("status", "pending");
      await writeActivity({
        creedId,
        sectionId: proposal.section_id,
        sectionName: proposal.section_name,
        accent: proposal.accent,
        actorUserId: user.id,
        actorType: "user",
        actorName,
        summary: `A proposed edit to ${proposal.section_name} went stale (the section changed after it was proposed)`,
        status: "stale",
        eventKind: "proposal",
      });
      return {
        ok: false,
        code: "stale",
        error: "The section changed since this was proposed.",
      };
    }
  }

  // Accept: apply the draft to the section rows, resolve the proposal, log it.
  const applied = await applyDraft({
    creedId,
    sectionId: proposal.draft.kind === "new-section" ? null : proposal.section_id,
    draft: proposal.draft,
    actor: describeActor(user, null),
    cause: "proposal",
    expectedRevision: proposal.base_revision,
    proposalId, activity: (applied) => ({
    creedId,
    sectionId: applied.sectionId,
    sectionName: applied.sectionName,
    accent: applied.accent,
    actorUserId: user.id,
    actorType: "user",
    actorName,
    summary: `${actorName} accepted a proposed edit to ${applied.sectionName}`,
    status: "accepted",
    eventKind: "proposal",
    beforeText: applied.before,
    afterText: applied.after,
  })});
  if (!applied.ok) return applied;

  const acceptResult: SectionWriteOk = {
    ok: true,
    revision: applied.revision,
    sectionId: applied.sectionId,
    sectionName: applied.sectionName,
    accent: applied.accent,
    contentHtml: applied.after,
  };
  return acceptResult;
}

export async function reviewPersonalProposal(params: {
  creedId: string;
  user: User;
  proposalId: string;
  decision: "accept" | "reject" | "dismiss" | "stale";
}): Promise<SectionWriteResult> {
  const { creedId, user, proposalId, decision } = params;
  const db = admin();
  const loaded = await loadCreedState(db, user, { creedId, proposalLimit: 5000 });
  const proposal = loaded.state.proposals.find((entry) => entry.id === proposalId);
  if (!proposal) return { ok: false, code: "not_found", error: "Proposal not found." };
  if (proposal.status !== "pending" && !(decision === "dismiss" && proposal.status === "stale")) {
    return { ok: false, code: "conflict", error: "This proposal was already reviewed." };
  }
  if (decision === "accept" && proposal.draft.kind !== "new-section" && proposal.baseRevision != null &&
    proposal.baseRevision !== loaded.state.sectionRevisions[proposal.sectionId]) {
    return reviewPersonalProposal({ ...params, decision: "stale" });
  }
  try {
    let next = decision === "accept" ? applyPersonalProposal(loaded.state, proposal) : loaded.state;
    next = {
      ...next,
      proposals: decision === "stale"
        ? next.proposals.map((entry) => entry.id === proposalId ? { ...entry, status: "stale" } : entry)
        : next.proposals.filter((entry) => entry.id !== proposalId),
      activity: [{
        id: `review-${proposalId}-${decision}`, proposalId,
        createdAt: new Date().toISOString(), dayLabel: "Today", timeLabel: "just now",
        sectionId: proposal.sectionId, sectionName: proposal.sectionName, accent: proposal.accent,
        actor: proposal.agentName, actorType: "agent",
        summary: `${decision === "accept" ? "Accepted" : decision === "reject" ? "Rejected" : "Dismissed"} ${proposal.sectionName.toLowerCase()} proposal`,
        status: decision === "accept" ? "accepted" : decision === "stale" ? "stale" : "rejected",
        changeType: proposal.changeType, reason: proposal.reason, impact: proposal.impact, confidence: proposal.confidence,
        beforeText: loaded.state.sections.find((section) => section.id === proposal.sectionId)?.content,
        afterText: next.sections.find((section) => section.id === proposal.sectionId)?.content ?? "",
      }, ...next.activity],
    };
    await persistCreedState(db, user.id, next, creedId, { id: proposalId, decision, draft: proposal.draft });
    return { ok: true, revision: 0 };
  } catch (error) {
    return { ok: false, code: error instanceof PersistenceConflict || (error instanceof Error && error.message.includes("older section revision")) ? "conflict" : "failed",
      error: error instanceof Error ? error.message : "Could not review the proposal." };
  }
}


export type SectionVersionEntry = {
  id: number;
  revision: number;
  name: string;
  cause: string;
  actorType: string;
  agentName: string | null;
  createdAt: string;
};

/** List a section's stored versions, newest first (owner/admin only). */
export async function listSectionVersions(params: {
  creedId: string;
  user: User;
  sectionId: string;
}): Promise<
  { ok: true; versions: SectionVersionEntry[] } | SectionWriteError
> {
  const db = admin();
  const role = await getCreedRole(db, params.user.id, params.creedId);
  if (role !== "owner" && role !== "admin") {
    return {
      ok: false,
      code: "forbidden",
      error: "Only an owner or admin can view section history.",
    };
  }
  const { data } = (await db
    .from("creed_section_versions")
    .select("id, revision, name, cause, actor_type, agent_name, created_at")
    .eq("creed_id", params.creedId)
    .eq("section_id", params.sectionId)
    .order("id", { ascending: false })
    .limit(100)) as {
    data: Array<{
      id: number;
      revision: number;
      name: string;
      cause: string;
      actor_type: string;
      agent_name: string | null;
      created_at: string;
    }> | null;
  };
  return {
    ok: true,
    versions: (data ?? []).map((row) => ({
      id: row.id,
      revision: row.revision,
      name: row.name,
      cause: row.cause,
      actorType: row.actor_type,
      agentName: row.agent_name,
      createdAt: row.created_at,
    })),
  };
}

/**
 * Restore a stored version by writing its content/name/accent as a NEW
 * revision via the shared applyDraft (cause "restore") - history is never
 * destroyed, so a restore can itself be undone. Owner/admin only.
 */
export async function restoreSectionVersion(params: {
  creedId: string;
  user: User;
  sectionId: string;
  versionId: number;
}): Promise<SectionWriteResult> {
  const { creedId, user, sectionId, versionId } = params;
  const db = admin();
  const role = await getCreedRole(db, user.id, creedId);
  if (role !== "owner" && role !== "admin") {
    return {
      ok: false,
      code: "forbidden",
      error: "Only an owner or admin can restore a version.",
    };
  }
  const { data: version } = (await db
    .from("creed_section_versions")
    .select("content, name, accent")
    .eq("creed_id", creedId)
    .eq("section_id", sectionId)
    .eq("id", versionId)
    .maybeSingle()) as {
    data: { content: string; name: string; accent: string } | null;
  };
  if (!version) {
    return { ok: false, code: "not_found", error: "Version not found." };
  }
  const applied = await applyDraft({
    creedId,
    sectionId,
    draft: {
      kind: "rich-text",
      contentHtml: version.content,
      name: version.name,
      accent: version.accent,
    },
    actor: describeActor(user, null),
    cause: "restore",
    activity: (applied) => ({ creedId, sectionId: applied.sectionId, sectionName: applied.sectionName,
      accent: applied.accent, actorUserId: user.id, actorType: "user", actorName: memberName(user),
      summary: `${memberName(user)} restored an earlier version of ${applied.sectionName}`,
      status: "accepted", eventKind: "edit", beforeText: applied.before, afterText: applied.after }),
  });
  if (!applied.ok) return applied;

  return { ok: true, revision: applied.revision };
}

/** Permanently delete a section (owner/admin, from the app). */
export async function deleteSharedSection(params: {
  creedId: string;
  user: User;
  sectionId: string;
}): Promise<SectionWriteResult> {
  const { creedId, user, sectionId } = params;
  const db = admin();
  const role = await getCreedRole(db, user.id, creedId);
  if (!role || !canManageSectionsLifecycle(role)) {
    return {
      ok: false,
      code: "forbidden",
      error: "Only an owner or admin can delete sections.",
    };
  }
  const { data: current } = (await db
    .from("creed_sections")
    .select("section_id, name, accent")
    .eq("creed_id", creedId)
    .eq("section_id", sectionId)
    .is("deleted_at", null)
    .maybeSingle()) as {
    data: { section_id: string; name: string; accent: string } | null;
  };
  if (!current) {
    return { ok: false, code: "not_found", error: "Section not found." };
  }

  const deleted = await applyDraft({
    creedId, sectionId, draft: { kind: "delete-section" }, actor: describeActor(user, null), cause: "manual",
    activity: () => ({ creedId, sectionId: current.section_id, sectionName: current.name,
      accent: current.accent, actorUserId: user.id, actorType: "user", actorName: memberName(user),
      summary: `${memberName(user)} deleted ${current.name}`, status: "direct", eventKind: "edit" }),
  });
  if (!deleted.ok) return deleted;
  return { ok: true, revision: 0 };
}

/**
 * Reorder a Shared Creed's sections (owner/admin only). Writes each visible
 * section's new position (0..N-1) so every member sees the new order on their
 * next sync. Members can't reach this (the UI hides drag; this re-checks).
 */
export async function reorderSharedSections(params: {
  creedId: string;
  user: User;
  sectionIds: string[];
}): Promise<{
  ok: boolean;
  code?: "forbidden" | "failed";
  error?: string;
}> {
  const { creedId, user, sectionIds } = params;
  const db = admin();

  const role = await getCreedRole(db, user.id, creedId);
  if (!role)
    return {
      ok: false,
      code: "forbidden",
      error: "You are not a member of this Creed.",
    };
  if (!canManageSectionsLifecycle(role)) {
    return {
      ok: false,
      code: "forbidden",
      error: "Only an owner or admin can reorder sections.",
    };
  }

  try {
    await renumberSections(creedId, sectionIds, new Date().toISOString());
  } catch {
    return {
      ok: false,
      code: "failed",
      error: "Could not save the new order.",
    };
  }
  return { ok: true };
}

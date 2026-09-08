import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DocumentWriteQueue } from "../lib/document-write-queue.ts";
import { fetchForCreed } from "../lib/creed-request.ts";
import { applyPersonalProposal, restoreProposalDraft } from "../lib/personal-proposal-review.ts";
import { initialCreedState, type Proposal } from "@creed/core/creed-data";
import { validateCreedState } from "@creed/core/validation/creed-state";

function fixture() {
  const section = { id: "identity", kind: "rich-text" as const, template: "identity" as const,
    name: "Identity", content: "<p>Current</p>", accent: "identity" as const,
    agentPermission: "hidden" as const, agentWritable: false,
    lastEditedBy: "You", lastEditedType: "user" as const, lastEditedLabel: "just now" };
  return { ...structuredClone(initialCreedState), creedId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    sections: [section], proposals: [], activity: [], sectionRevisions: { identity: 3 },
    persistenceBaseline: { identity: { revision: 3, position: 0, permission: "hidden", archived: false } },
    persistenceSettingsBaseline: { requireApproval: true, versionControl: initialCreedState.settings.versionControl },
  };
}
function proposal(draft: Proposal["draft"], baseRevision = 3): Proposal {
  return { id: "proposal-example", sectionId: "identity", sectionName: "Identity", accent: "identity",
    agentName: "Agent", changeType: "refines-existing", reason: "A useful change", impact: "future-responses",
    confidence: "durable", status: "pending", draft, baseRevision, timeLabel: "just now" };
}

test("one document's saves run in order while another document can save", async () => {
  const queue = new DocumentWriteQueue();
  const calls: string[] = [];
  let release!: () => void;
  const first = queue.run("A", async () => { calls.push("A1"); await new Promise<void>((resolve) => { release = resolve; }); });
  const second = queue.run("A", async () => { calls.push("A2"); });
  await queue.run("B", async () => { calls.push("B"); });
  assert.deepEqual(calls, ["A1", "B"]);
  release(); await Promise.all([first, second]); await queue.drain("A");
  assert.deepEqual(calls, ["A1", "B", "A2"]);
});

test("a failed save does not strand later writes", async () => {
  const queue = new DocumentWriteQueue();
  await assert.rejects(queue.run("A", async () => { throw new Error("offline"); }), /offline/);
  assert.equal(await queue.run("A", async () => "saved"), "saved");
});

test("GitHub requests retain the displayed document and existing request headers", async (t) => {
  let request: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (_input: string, init: RequestInit) => { request = init; return new Response("{}"); });
  await fetchForCreed("displayed-A", "/api/app/github/push", { method: "POST", headers: { "Content-Type": "application/json" } });
  assert.equal(new Headers(request?.headers).get("x-creed-id"), "displayed-A");
  assert.equal(new Headers(request?.headers).get("Content-Type"), "application/json");
  await assert.rejects(fetchForCreed(undefined, "/api/app/github/push"), /selected/);
});

test("stale proposal content cannot overwrite a newer section", () => {
  const state = fixture();
  assert.throws(() => applyPersonalProposal(state, proposal({ kind: "rich-text", contentHtml: "<p>Older</p>" }, 2)), /older section revision/);
  assert.equal(state.sections[0].content, "<p>Current</p>");
});

test("a proposal preserves hidden permissions and gives deterministic new-section IDs", () => {
  const state = fixture();
  const edited = applyPersonalProposal(state, proposal({ kind: "rich-text", contentHtml: "<p>Updated</p>" }));
  assert.equal(edited.sections[0].agentPermission, "hidden");
  assert.equal(edited.sections[0].agentWritable, false);
  const addition = proposal({ kind: "new-section", name: "Goals", contentHtml: "<p>Learn</p>" });
  assert.deepEqual(applyPersonalProposal(state, addition).sections, applyPersonalProposal(state, addition).sections);
  assert.equal(state.sections.length, 1);
});

test("a failed proposal review restores only that draft and keeps later edits", () => {
  const pending = proposal({ kind: "rich-text", contentHtml: "<p>Proposed</p>" });
  const before = { ...fixture(), proposals: [pending] };
  const optimistic = applyPersonalProposal(before, pending);
  const current = {
    ...optimistic,
    sections: [
      optimistic.sections[0],
      { ...fixture().sections[0], id: "goals", name: "Goals", content: "<p>Typed after</p>", template: "freeform" as const, accent: "goals" as const },
    ],
  };
  const restored = restoreProposalDraft(before, optimistic, current, pending);
  assert.equal(restored.sections.find((section) => section.id === "identity")?.content, "<p>Current</p>");
  assert.equal(restored.sections.find((section) => section.id === "goals")?.content, "<p>Typed after</p>");
  assert.equal(restored.proposals[0]?.id, "proposal-example");
});

test("personal section colour and name use the per-section PUT, not a full-state write", () => {
  const provider = readFileSync(new URL("../components/creed/creed-provider.tsx", import.meta.url), "utf8");
  const route = readFileSync(
    new URL("../app/api/app/sections/[sectionId]/route.ts", import.meta.url),
    "utf8",
  );
  const backend = readFileSync(new URL("../lib/creed-backend.ts", import.meta.url), "utf8");
  const setAccent = provider.slice(provider.indexOf("function setSectionAccent"));
  const rename = provider.slice(
    provider.indexOf("function renameSection"),
    provider.indexOf("function setSectionAccent"),
  );

  assert.match(setAccent, /void saveSharedSectionMeta\(sectionId, \{ accent \}\)/);
  assert.doesNotMatch(
    setAccent.slice(0, setAccent.indexOf("function duplicateSection")),
    /nextMutationTick/,
  );
  assert.match(rename, /void saveSharedSectionMeta\(sectionId, \{ name: trimmed \}\)/);
  assert.doesNotMatch(rename, /creedType === "shared"/);
  assert.match(route, /const accent = typeof b.accent === "string" \? b.accent : undefined/);
  assert.match(backend, /params.accent !== undefined && !isSelectableAccentKey\(params.accent\)/);
  assert.match(backend, /accentChanged/);
});

test("adding a section uses the per-section POST, not a full-state write", () => {
  const provider = readFileSync(new URL("../components/creed/creed-provider.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/app/sections/route.ts", import.meta.url), "utf8");
  const backend = readFileSync(new URL("../lib/creed-backend.ts", import.meta.url), "utf8");
  const addSection = provider.slice(
    provider.indexOf("function addSection("),
    provider.indexOf("function addSectionAfter("),
  );
  const addAfter = provider.slice(
    provider.indexOf("function addSectionAfter("),
    provider.indexOf("function renameSection("),
  );

  assert.match(addSection, /void runSharedSectionCreate\(newSection\)/);
  assert.doesNotMatch(addSection, /nextMutationTick/);
  assert.match(addAfter, /void runSharedSectionCreate\(newSection, afterSectionId\)/);
  assert.doesNotMatch(addAfter, /nextMutationTick/);
  assert.match(route, /createPersonalSection/);
  assert.match(route, /personalResult\.code === "forbidden"/);
  assert.match(backend, /export async function createPersonalSection/);
});

test("section lifecycle never uses a full-state write", () => {
  const provider = readFileSync(new URL("../components/creed/creed-provider.tsx", import.meta.url), "utf8");
  const sectionRoute = readFileSync(
    new URL("../app/api/app/sections/[sectionId]/route.ts", import.meta.url),
    "utf8",
  );
  const reorderRoute = readFileSync(
    new URL("../app/api/app/sections/reorder/route.ts", import.meta.url),
    "utf8",
  );
  const backend = readFileSync(new URL("../lib/creed-backend.ts", import.meta.url), "utf8");
  const slices = {
    reorderSections: provider.slice(
      provider.indexOf("function reorderSections("),
      provider.indexOf("function addSection("),
    ),
    duplicateSection: provider.slice(
      provider.indexOf("function duplicateSection("),
      provider.indexOf("function deleteSection("),
    ),
    deleteSection: provider.slice(
      provider.indexOf("function deleteSection("),
      provider.indexOf("function archiveSection("),
    ),
    archiveSection: provider.slice(
      provider.indexOf("function archiveSection("),
      provider.indexOf("function restoreSection("),
    ),
    restoreSection: provider.slice(
      provider.indexOf("function restoreSection("),
      provider.indexOf("function archiveCreed("),
    ),
    archiveCreed: provider.slice(
      provider.indexOf("function archiveCreed("),
      provider.indexOf("function clearSections("),
    ),
    clearSections: provider.slice(
      provider.indexOf("function clearSections("),
      provider.indexOf("async function reviewSharedProposalRemote("),
    ),
    toggleLock: provider.slice(
      provider.indexOf("function toggleLock("),
      provider.indexOf("function toggleSectionLock("),
    ),
    setSectionPermission: provider.slice(
      provider.indexOf("function setSectionPermission("),
      provider.indexOf("function setAllSectionPermissions("),
    ),
    setAllSectionPermissions: provider.slice(
      provider.indexOf("function setAllSectionPermissions("),
      provider.indexOf("function setVersionControlConfig("),
    ),
  };

  for (const [name, slice] of Object.entries(slices)) {
    assert.doesNotMatch(slice, /nextMutationTick/, name);
  }
  assert.match(slices.reorderSections, /\/api\/app\/sections\/reorder/);
  assert.doesNotMatch(slices.reorderSections, /creedType === "shared"/);
  assert.match(slices.duplicateSection, /void runSharedSectionCreate\(clone, sectionId\)/);
  assert.match(slices.deleteSection, /void runSharedSectionDelete\(sectionId\)/);
  assert.doesNotMatch(slices.deleteSection, /creedType === "shared"/);
  assert.match(slices.archiveSection, /void runSharedSectionArchive\(sectionId, true\)/);
  assert.match(slices.restoreSection, /void runSharedSectionArchive\(sectionId, false\)/);
  assert.match(slices.archiveCreed, /runSharedSectionArchive\(sectionId, true, \{ sync: false \}\)/);
  assert.match(slices.archiveCreed, /runSharedSectionCreate\(placeholder\)/);
  assert.match(slices.clearSections, /runSharedSectionDelete\(sectionId\)/);
  assert.match(slices.clearSections, /runSharedSectionCreate\(section\)/);
  assert.match(slices.setSectionPermission, /void runSharedSectionPermission\(sectionId, permission\)/);
  assert.match(sectionRoute, /deletePersonalSection/);
  assert.match(sectionRoute, /setPersonalSectionArchived/);
  assert.match(sectionRoute, /setPersonalSectionPermission/);
  assert.match(reorderRoute, /reorderPersonalSections/);
  assert.match(backend, /export async function deletePersonalSection/);
  assert.match(backend, /export async function setPersonalSectionArchived/);
  assert.match(backend, /export async function reorderPersonalSections/);
  assert.match(backend, /export async function setPersonalSectionPermission/);
});

test("a full-state conflict keeps the local draft and does not retry", () => {
  const provider = readFileSync(new URL("../components/creed/creed-provider.tsx", import.meta.url), "utf8");
  assert.match(provider, /if \(response\.status === 409\) throw new PersistenceConflict/);
  assert.match(provider, /if \(error instanceof PersistenceConflict\) return/);
});

test("structural shared writes are serialized and transaction conflicts retry once", () => {
  const provider = readFileSync(new URL("../components/creed/creed-provider.tsx", import.meta.url), "utf8");
  const sharedSections = readFileSync(new URL("../lib/shared-sections.ts", import.meta.url), "utf8");
  const createSection = provider.split("async function runSharedSectionCreate")[1]?.split("async function saveSharedSectionMeta")[0] ?? "";
  const reviewProposal = provider.split("async function reviewSharedProposalRemote")[1]?.split("async function reviewPersonalProposalRemote")[0] ?? "";

  assert.match(createSection, /documentWrites\.current\.run\(creedId/);
  assert.match(reviewProposal, /documentWrites\.current\.run\(creedId/);
  assert.match(sharedSections, /retryWriteConflict !== false/);
  assert.match(sharedSections, /resolvedSectionId: sectionId, retryWriteConflict: false/);
  assert.match(sharedSections, /reviewPersonalProposalAttempt\(params, false\)/);
});

test("the persistence validator rejects malformed values before any write", () => {
  const state = fixture();
  assert.equal(validateCreedState(state).ok, true);
  for (const patch of [
    { settings: {} }, { proposals: [null] }, { activity: [null] }, { creedId: undefined },
    { sections: [{ ...state.sections[0], kind: undefined }] },
    { sections: [state.sections[0], state.sections[0]] },
    { persistenceBaseline: { identity: { revision: "three" } } },
  ]) assert.equal(validateCreedState({ ...state, ...patch }).ok, false, JSON.stringify(patch));
});

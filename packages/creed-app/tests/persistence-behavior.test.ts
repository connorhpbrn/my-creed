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

test("a full-state conflict keeps the local draft and does not retry", () => {
  const provider = readFileSync(new URL("../components/creed/creed-provider.tsx", import.meta.url), "utf8");
  assert.match(provider, /if \(response\.status === 409\) throw new PersistenceConflict/);
  assert.match(provider, /if \(error instanceof PersistenceConflict\) return/);
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

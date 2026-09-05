import {
  applyReorderDraft, inferAgentSectionAccent, normalizeLegacyProposalDraft,
  type CreedState, type CreedSection, type Proposal,
} from "@creed/core/creed-data";
import { normalizeRichTextInput, removeSectionReferencesFromSections } from "@creed/core/rich-text";

/** The same deterministic transformation drives optimistic rendering and persistence. */
export function applyPersonalProposal(state: CreedState, proposal: Proposal): CreedState {
  const draft = normalizeLegacyProposalDraft(proposal.draft);
  const target = state.sections.find((section) => section.id === proposal.sectionId);
  if (draft.kind !== "new-section" && !target) throw new Error("Section not found.");
  if (draft.kind !== "new-section" && proposal.baseRevision != null &&
    proposal.baseRevision !== state.sectionRevisions[proposal.sectionId]) {
    throw new Error("This proposal is based on an older section revision.");
  }
  let sections = state.sections;
  if (draft.kind === "new-section") {
    const section: CreedSection = {
      id: `section-proposal-${proposal.id}`, kind: "rich-text",
      template: draft.template ?? "freeform", name: draft.name.trim() || "New section",
      accent: draft.accent ?? inferAgentSectionAccent({ name: draft.name, content: draft.contentMarkdown ?? draft.contentHtml, insertAfterSectionId: draft.insertAfterSectionId }),
      content: normalizeRichTextInput(draft), agentWritable: true, agentPermission: "propose",
      lastEditedBy: proposal.agentName, lastEditedType: "agent", lastEditedLabel: "just now",
    };
    if (sections.some((existing) => existing.id === section.id)) throw new Error("Section already exists.");
    const anchor = sections.findIndex((existing) => existing.id === draft.insertAfterSectionId);
    const index = anchor < 0 ? sections.length : anchor + 1;
    sections = [...sections.slice(0, index), section, ...sections.slice(index)];
  } else if (draft.kind === "delete-section" && target) {
    sections = removeSectionReferencesFromSections(sections, target);
  } else if (draft.kind === "reorder-section") {
    sections = applyReorderDraft(sections, proposal.sectionId, draft);
  } else {
    sections = sections.map((section) => {
      if (section.id !== proposal.sectionId) return section;
      const patch = draft.kind === "rename-section" ? { name: draft.name.trim() || section.name }
        : draft.kind === "recolor-section" ? { accent: draft.accent }
        : draft.kind === "rich-text" ? { content: normalizeRichTextInput(draft) } : {};
      return { ...section, ...patch, lastEditedBy: proposal.agentName, lastEditedType: "agent", lastEditedLabel: "just now" };
    });
  }
  return { ...state, sections, proposals: state.proposals.filter((entry) => entry.id !== proposal.id) };
}

/** Undo only this optimistic review, retaining edits made while it was pending. */
export function restoreProposalDraft(before: CreedState, optimistic: CreedState, current: CreedState, proposal: Proposal): CreedState {
  const previous = new Map(before.sections.map((section) => [section.id, section]));
  const applied = new Map(optimistic.sections.map((section) => [section.id, section]));
  const sections = current.sections.flatMap((section) => {
    if (section !== applied.get(section.id)) return [section];
    const original = previous.get(section.id);
    return original ? [original] : [];
  });
  for (const [index, section] of before.sections.entries()) {
    if (!applied.has(section.id) && !sections.some((entry) => entry.id === section.id)) {
      sections.splice(Math.min(index, sections.length), 0, section);
    }
  }
  if (current.sections.map((section) => section.id).join("\0") === optimistic.sections.map((section) => section.id).join("\0")) {
    const order = new Map(before.sections.map((section, index) => [section.id, index]));
    sections.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
  }
  return { ...current, sections,
    proposals: current.proposals.some((entry) => entry.id === proposal.id)
      ? current.proposals.map((entry) => entry.id === proposal.id ? proposal : entry)
      : [...current.proposals, proposal] };
}

"use client";

// Two interactive mini-demos for the "Review everything or nothing" section,
// built from the real app diff helpers fed mock data:
//  - ProposalDemo: one big proposal card you accept / reject; doing so smoothly
//    transitions to the next of three (Claude Code -> Codex -> Grok), then an
//    "all caught up" state. The diff scrolls when it overflows.
//  - DirectEditDemo: playback of the settings agent-permission control plus a
//    Beliefs diff card. The control loops Propose / Direct and skips Read-only.
// The diff card is a demo-only variant of InlineProposalDiff so the shared app
// component stays untouched.
// Client-only mock state, no backend.

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { CreedDiffView, DiffBadge } from "@/components/creed/inline-proposal-diff";
import { ChevronDownIcon as AnimatedChevronDown } from "@creed/ui/chevron-down";
import { computeCreedDiff } from "@/lib/creed-diff";
import { AgentIconStack } from "@/components/creed/agent-icon-stack";
import {
  GLOBAL_PERMISSION_OPTIONS,
  SectionPermissionControl,
} from "@/components/creed/section-permission-control";
import {
  type AccentKey,
  type AgentPermission,
  type Proposal,
  getProposalPreviewText,
} from "@creed/core/creed-data";
import { cn } from "@creed/ui/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const DEMO_PERMISSION_OPTIONS = GLOBAL_PERMISSION_OPTIONS.filter(
  (option) => option.value !== "read-only",
);

function makeProposal(
  id: string,
  sectionId: string,
  sectionName: string,
  accent: AccentKey,
  agentName: string,
  reason: string,
  contentMarkdown: string
): Proposal {
  return {
    id,
    sectionId,
    sectionName,
    accent,
    agentName,
    timeLabel: "just now",
    changeType: "refines-existing",
    reason,
    impact: "future-responses",
    confidence: "repeated",
    draft: { kind: "rich-text", contentMarkdown },
    status: "pending",
  };
}

const SEED: Array<{ proposal: Proposal; base: string }> = [
  {
    proposal: makeProposal(
      "cc-1",
      "preferences",
      "Preferences",
      "preferences",
      "Claude Code",
      "You keep choosing to ask rather than act.",
      [
        "Prefer doing the work over asking for permission, unless the action is destructive.",
        "Lead with the answer, then the reasoning.",
        "Raise the single biggest risk, not every objection.",
        "Ship, then iterate.",
      ].join("\n")
    ),
    base: [
      "Always include the uncomfortable constraint, even when it is not asked for.",
      "Walk through every assumption one at a time.",
      "List every possible objection before giving an opinion.",
      "Ask for sign-off in writing before shipping.",
    ].join("\n"),
  },
  {
    proposal: makeProposal(
      "codex-1",
      "routines",
      "Routines",
      "workflows",
      "Codex",
      "Your check-ins got shorter and moved to mornings only.",
      [
        "Check in each morning with a short status note.",
        "Skip the evening recap unless something is blocked.",
        "Keep the log only when a decision actually changed.",
      ].join("\n")
    ),
    base: [
      "Check in every morning with a full written status report.",
      "Send an evening recap covering everything in flight.",
      "Keep a running log of what changed and why.",
    ].join("\n"),
  },
  {
    proposal: makeProposal(
      "grok-1",
      "goals",
      "Goals",
      "projects",
      "Grok",
      "You paused three channels last week to focus on work.",
      [
        "Double down on the two channels that already convert.",
        "Pause the rest for now.",
        "Protect time for the work that actually compounds.",
      ].join("\n")
    ),
    base: [
      "Chase growth on every channel at once.",
      "Never turn any of them off.",
      "Spend equally even when a channel is clearly dead.",
    ].join("\n"),
  },
];

// Demo-only proposal diff: same chrome as InlineProposalDiff. Desktop names
// the proposing agent; mobile keeps the header compact with only the icon.
function DemoProposalDiff({
  proposal,
  existingContent,
  expanded,
}: {
  proposal: Proposal;
  existingContent: string;
  expanded: boolean;
}) {
  const proposed = useMemo(() => getProposalPreviewText(proposal.draft), [proposal.draft]);
  const diff = useMemo(() => computeCreedDiff(existingContent, proposed), [existingContent, proposed]);

  // Display only: the section auto-plays the review cycle, so nothing here is
  // clickable. The chevron and the Reject / Accept controls are presentational.
  return (
    <div className="rounded-xl border border-[var(--creed-border)] bg-[var(--creed-surface)] shadow-[0_8px_24px_rgba(28,28,26,0.04)]">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-[var(--creed-text-secondary)]">
          <AgentIconStack agents={[proposal.agentName]} variant="inline" itemClassName="h-5 w-5" maxVisible={1} />
          <span className="hidden truncate font-medium text-[var(--creed-text-primary)] sm:inline">
            {proposal.agentName}
          </span>
          <span className="hidden text-[var(--creed-text-tertiary)] sm:inline">
            proposed
          </span>
          <span className="text-[var(--creed-text-tertiary)]">·</span>
          <span className="inline-flex items-center gap-1">
            <DiffBadge tone="added" count={diff.added} size="md" />
            <DiffBadge tone="removed" count={diff.removed} size="md" />
          </span>
          <AnimatedChevronDown
            size={14}
            className={cn(
              "shrink-0 -rotate-90 text-[var(--creed-text-tertiary)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
              expanded && "rotate-0 text-[var(--creed-text-primary)]",
            )}
          />
        </div>
        <div className="-mr-1 flex shrink-0 items-center gap-1" aria-hidden="true">
          <span className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-sm font-medium text-[var(--creed-text-secondary)]">
            Reject
          </span>
          <span className="inline-flex h-7 items-center gap-1 rounded-md bg-[var(--creed-accent)] px-2.5 text-sm font-medium text-white">
            Accept
          </span>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--creed-border)]" />
            <div className="creed-diff-block creed-scrollbar max-h-[228px] overflow-y-auto py-3">
              <CreedDiffView diff={diff} />
            </div>
            {proposal.reason ? (
              <div className="border-t border-[var(--creed-border)] px-4 py-2.5 text-sm leading-5 text-[var(--creed-text-secondary)]">
                {proposal.reason}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ProposalDemo() {
  const [present, setPresent] = useState<string[]>(SEED.map((s) => s.proposal.id));
  // Keyed to the active proposal so a swap cannot inherit the previous
  // card's expanded flag for one tall frame.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const live = useMemo(() => SEED.filter((s) => present.includes(s.proposal.id)), [present]);
  const active = live[0];
  const activeId = active?.proposal.id ?? null;
  const expanded = expandedId === activeId;

  // Auto-play, no clicks: each proposal enters collapsed, expands after a
  // beat, then resolves and advances to the next. The caught-up state holds
  // briefly, then the whole loop replays on its own - no replay button.
  useEffect(() => {
    if (!activeId) {
      setExpandedId(null);
      const replay = window.setTimeout(
        () => setPresent(SEED.map((s) => s.proposal.id)),
        2200,
      );
      return () => window.clearTimeout(replay);
    }
    const expand = window.setTimeout(() => setExpandedId(activeId), 650);
    const advance = window.setTimeout(
      () => setPresent((prev) => prev.filter((p) => p !== activeId)),
      3600,
    );
    return () => {
      window.clearTimeout(expand);
      window.clearTimeout(advance);
    };
  }, [activeId]);

  return (
    <div className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {active ? (
          <motion.div
            key={active.proposal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: EASE }}
          >
            <DemoProposalDiff
              proposal={active.proposal}
              existingContent={active.base}
              expanded={expanded}
            />
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[var(--creed-border)] bg-[var(--creed-surface)] px-6 py-12 text-center shadow-[0_8px_24px_rgba(28,28,26,0.04)]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ECFDF5] text-[#16A34A] dark:bg-[#052e1a]/55 dark:text-[#4ade80]">
              <Check className="h-4 w-4" />
            </span>
            <div className="text-[14px] font-medium text-[var(--creed-text-primary)]">You are all caught up</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function nextDemoPermission(current: AgentPermission): AgentPermission {
  return current === "direct" ? "propose" : "direct";
}

const DIRECT_BASE = [
  "Keep the file large and exhaustive.",
  "Capture every passing preference so nothing is left out.",
  "Retain details that stopped mattering months ago.",
  "Treat completeness as more important than signal.",
].join("\n");
const DIRECT_NEXT = [
  "Keep the file tight and high-signal.",
  "Prune stale detail so the file stays sharp.",
  "Trust that less is more.",
  "Prefer a short true file over a complete one.",
].join("\n");

export function DirectEditDemo() {
  const [permission, setPermission] = useState<AgentPermission>("direct");
  const diff = useMemo(() => computeCreedDiff(DIRECT_BASE, DIRECT_NEXT), []);
  const pending = permission === "propose";

  useEffect(() => {
    const id = window.setTimeout(
      () => setPermission((current) => nextDemoPermission(current)),
      3200,
    );
    return () => window.clearTimeout(id);
  }, [permission]);

  return (
    <div className="w-full space-y-3">
      <div className="rounded-[var(--radius-xl)] border border-[var(--creed-border)] bg-[var(--creed-surface)] px-5 py-4 shadow-[0_8px_24px_rgba(28,28,26,0.04)]">
        <div className="flex items-center justify-between gap-5">
          <div className="text-[15px] font-medium leading-none text-[var(--creed-text-primary)]">
            Require approval for agent edits
          </div>
          <div className="pointer-events-none" inert>
            <SectionPermissionControl
              value={permission}
              onChange={setPermission}
              layoutGroup="direct-edit-demo"
              options={DEMO_PERMISSION_OPTIONS}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--creed-border)] bg-[var(--creed-surface)] shadow-[0_8px_24px_rgba(28,28,26,0.04)]">
        <div className="px-3 pb-2 pt-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-[var(--creed-text-primary)]">Beliefs</span>
            <span
              className={cn(
                "ml-auto inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[10px] font-medium",
                pending
                  ? "bg-[#EFF6FF] text-[var(--creed-accent-hover)] dark:bg-[#172554]/55 dark:text-[#93c5fd]"
                  : "bg-[#FFF7ED] text-[#C2410C] dark:bg-[#431407]/55 dark:text-[#fdba74]"
              )}
            >
              {pending ? "Pending" : "Direct"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--creed-text-secondary)]">
            <AgentIconStack agents={["Codex"]} variant="inline" itemClassName="h-4 w-4 shrink-0" />
            <span>Codex</span>
            <span className="text-[var(--creed-text-tertiary)]">&middot;</span>
            <DiffBadge tone="added" count={diff.added} />
            <DiffBadge tone="removed" count={diff.removed} />
            <span className="ml-auto text-[var(--creed-text-tertiary)]">3w ago</span>
          </div>
        </div>
        <div className="border-t border-[var(--creed-border)]" />
        <div className="creed-diff-block py-3 text-[14px]">
          <CreedDiffView diff={diff} />
        </div>
      </div>
    </div>
  );
}

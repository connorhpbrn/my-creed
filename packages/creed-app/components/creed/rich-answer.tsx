"use client";

// Renders an Ask answer as the same Creed editor components the file uses:
// headings, lists, checklists, tables, callouts, code, dividers, and inline
// marks. Answers paint in full on the first frame. Per-word stagger with
// `filter` inside the panel's transformed shell left the last turn invisible
// until the next message remounted it without animation.

import { type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SectionReferenceChip } from "@/components/creed/section-reference-chip";
import { CreedCodeBlock } from "@/components/creed/code-block";
import { accentColorMap, accentTintMap } from "@creed/core/creed-data";
import type { PanelSectionReference } from "@/lib/panel/actions";
import {
  parseAnswerBlocks,
  type ListGroup,
  type ListKind,
  type ListNode,
} from "@/lib/panel/rich-answer-blocks";
import {
  parseInlineMarkdown,
  type InlineNode,
} from "@/lib/panel/rich-answer-inline";
import { findSectionReferenceTarget } from "@creed/core/section-references";

const EASE = [0.22, 1, 0.36, 1] as const;

function lookupReference(
  value: string,
  references: ReadonlyMap<string, PanelSectionReference>,
) {
  return references.get(value) ?? findSectionReferenceTarget(value, [...references.values()]);
}

function renderInlineNode(
  node: InlineNode,
  key: string,
  references: ReadonlyMap<string, PanelSectionReference>,
  onSectionClick?: (sectionId: string) => void,
): ReactNode {
  if (node.type === "text") return node.text;
  if (node.type === "code") {
    return (
      <code
        key={key}
        className="rounded-[5px] bg-[var(--creed-surface-raised)] px-1 py-0.5 font-mono text-[0.85em]"
      >
        {node.text}
      </code>
    );
  }
  if (node.type === "section" || node.type === "tag") {
    const reference = lookupReference(node.type === "section" ? node.id : node.name, references);
    if (reference) {
      return (
        <SectionReferenceChip
          key={key}
          section={reference}
          onSelect={onSectionClick}
          accent="stack"
        />
      );
    }
    if (node.type === "tag") {
      return (
        <span key={key} className="creed-inline-tag">
          {node.name}
        </span>
      );
    }
    return `[[section:${node.id}]]`;
  }
  const children = node.children.map((child, index) =>
    renderInlineNode(child, `${key}-${index}`, references, onSectionClick),
  );
  if (node.type === "link") {
    return (
      <a
        key={key}
        href={node.href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-[var(--section-accent-bar,var(--creed-accent))]"
      >
        {children}
      </a>
    );
  }
  if (node.type === "strong") {
    return (
      <strong key={key} className="font-semibold">
        {children}
      </strong>
    );
  }
  if (node.type === "mark") {
    return (
      <mark key={key} className="creed-file-mark">
        {children}
      </mark>
    );
  }
  if (node.type === "u") {
    return (
      <u key={key} className="creed-file-underline">
        {children}
      </u>
    );
  }
  if (node.type === "s") return <s key={key}>{children}</s>;
  return <em key={key}>{children}</em>;
}

function renderInline(
  text: string,
  references: ReadonlyMap<string, PanelSectionReference>,
  onSectionClick?: (sectionId: string) => void,
): ReactNode[] {
  return parseInlineMarkdown(text).map((node, index) =>
    renderInlineNode(node, `i${index}`, references, onSectionClick),
  );
}

const ASK_BLUE_STYLE = {
  "--section-accent-bar": accentColorMap.stack,
  "--section-accent-tint": accentTintMap.stack,
} as CSSProperties;

const LIST_CLASS: Record<ListKind, string> = {
  bullets: "creed-list creed-list-bullet",
  numbered: "creed-list creed-list-ordered",
  tasks: "creed-list creed-list-task",
};

function AnswerListItem({
  item,
  references,
  onSectionClick,
}: {
  item: ListNode;
  references: ReadonlyMap<string, PanelSectionReference>;
  onSectionClick?: (sectionId: string) => void;
}) {
  return (
    <li
      className="creed-list-item"
      data-checked={item.checked === undefined ? undefined : String(item.checked)}
    >
      <p>{renderInline(item.text, references, onSectionClick)}</p>
      {item.children.length
        ? renderListGroups(item.children, references, onSectionClick)
        : null}
    </li>
  );
}

function renderListGroups(
  groups: ListGroup[],
  references: ReadonlyMap<string, PanelSectionReference>,
  onSectionClick?: (sectionId: string) => void,
): ReactNode {
  return groups.map((group, groupIndex) => {
    const Tag = group.kind === "numbered" ? "ol" : "ul";
    return (
      <Tag
        key={`${group.kind}-${groupIndex}`}
        className={`${LIST_CLASS[group.kind]} my-1 space-y-0.5`}
      >
        {group.items.map((item, itemIndex) => (
          <AnswerListItem
            key={itemIndex}
            item={item}
            references={references}
            onSectionClick={onSectionClick}
          />
        ))}
      </Tag>
    );
  });
}

export function RichAnswer({
  markdown,
  animate = false,
  className,
  references = [],
  onSectionClick,
  footer = null,
}: {
  markdown: string;
  animate?: boolean;
  className?: string;
  references?: PanelSectionReference[];
  onSectionClick?: (sectionId: string) => void;
  footer?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const blocks = parseAnswerBlocks(markdown);
  const referencesById = new Map(references.map((reference) => [reference.id, reference]));

  const content = blocks.map((block, index) => {
    if (block.kind === "heading") {
      const Tag = block.level <= 2 ? "h2" : block.level === 3 ? "h3" : "h4";
      return (
        <Tag key={index}>
          {renderInline(block.text, referencesById, onSectionClick)}
        </Tag>
      );
    }
    if (block.kind === "list") {
      return (
        <div key={index} className="first:mt-0">
          {renderListGroups(block.groups, referencesById, onSectionClick)}
        </div>
      );
    }
    if (block.kind === "callout") {
      return (
        <blockquote key={index} className="creed-callout my-2">
          <p>{renderInline(block.text, referencesById, onSectionClick)}</p>
        </blockquote>
      );
    }
    if (block.kind === "code") {
      return (
        <CreedCodeBlock key={index} code={block.text} language={block.language} />
      );
    }
    if (block.kind === "divider") {
      return <hr key={index} className="creed-hr" />;
    }
    if (block.kind === "table") {
      return (
        <div key={index} className="my-2 overflow-x-auto">
          <table className="creed-table">
            <tbody>
              {block.headerless ? null : (
                <tr>
                  {block.headers.map((cell, cellIndex) => (
                    <th key={cellIndex}>
                      <p>{renderInline(cell, referencesById, onSectionClick)}</p>
                    </th>
                  ))}
                </tr>
              )}
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      <p>{renderInline(cell, referencesById, onSectionClick)}</p>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <p key={index} className="mt-1.5 first:mt-0">
        {renderInline(block.text, referencesById, onSectionClick)}
      </p>
    );
  });

  const body = (
    <div className={`creed-ask-prose break-words ${className ?? ""}`} style={ASK_BLUE_STYLE}>
      {content}
      {footer}
    </div>
  );

  if (!animate || reduceMotion) return body;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: EASE }}
    >
      {body}
    </motion.div>
  );
}

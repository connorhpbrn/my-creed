"use client";

import { Fragment, type ReactNode } from "react";
import type { Element, RootContent } from "hast";
import { highlightCreedCode } from "@/lib/code-highlighting";

function renderHighlightedNode(node: RootContent, key: string): ReactNode {
  if (node.type === "text") return <Fragment key={key}>{node.value}</Fragment>;
  if (node.type !== "element") return null;
  const element = node as Element;
  const classNames = element.properties.className;
  const className = Array.isArray(classNames) ? classNames.join(" ") : String(classNames ?? "");
  return (
    <span key={key} className={className || undefined}>
      {element.children.map((child, index) => renderHighlightedNode(child, `${key}-${index}`))}
    </span>
  );
}

export function CreedCodeBlock({ code, language }: { code: string; language?: string }) {
  const normalizedLanguage = language?.trim().toLowerCase() ?? "";
  const highlighted = highlightCreedCode(code, normalizedLanguage);
  return (
    <div className="relative my-2 min-w-0">
      {normalizedLanguage ? (
        <span className="pointer-events-none absolute left-3 top-2 z-10 font-mono text-[10px] uppercase text-[var(--creed-text-tertiary)]">
          {normalizedLanguage}
        </span>
      ) : null}
      <pre
        className="creed-code-block max-w-full"
        style={normalizedLanguage ? { paddingTop: "2.15rem" } : undefined}
      >
        <code>
          {highlighted
            ? highlighted.children.map((node: RootContent, index: number) =>
                renderHighlightedNode(node, String(index)),
              )
            : code}
        </code>
      </pre>
    </div>
  );
}

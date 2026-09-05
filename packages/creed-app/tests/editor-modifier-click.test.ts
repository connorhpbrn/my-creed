import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isSafeNavigableHref,
  resolveEditorModifierClick,
} from "../lib/editor-modifier-click.ts";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("modifier click prefers a section tag over a wrapping link", () => {
  assert.deepEqual(resolveEditorModifierClick("goals", "https://creed.md"), {
    kind: "section",
    id: "goals",
  });
  assert.deepEqual(resolveEditorModifierClick("  people  ", null), {
    kind: "section",
    id: "people",
  });
});

test("modifier click opens safe http(s) and mailto links", () => {
  assert.deepEqual(resolveEditorModifierClick(null, "https://creed.md/docs"), {
    kind: "link",
    href: "https://creed.md/docs",
  });
  assert.deepEqual(resolveEditorModifierClick(null, "hello.com"), {
    kind: "link",
    href: "https://hello.com",
  });
  assert.deepEqual(resolveEditorModifierClick(null, "/hello.com"), {
    kind: "link",
    href: "https://hello.com",
  });
  assert.equal(isSafeNavigableHref("https://example.com"), true);
  assert.equal(isSafeNavigableHref("http://example.com"), true);
  assert.equal(isSafeNavigableHref("mailto:user@example.com"), true);
  assert.equal(isSafeNavigableHref("javascript:alert(1)"), false);
  assert.equal(resolveEditorModifierClick(null, "javascript:alert(1)"), null);
  assert.equal(resolveEditorModifierClick(null, ""), null);
  assert.equal(resolveEditorModifierClick(null, "/file"), null);
});

test("the live editor follows Cmd-click on links and section tags", () => {
  const editor = source("../components/creed/rich-text-editor.tsx");
  const file = source("../components/creed/file-screen.tsx");
  const css = source("../app/globals.css");

  assert.match(editor, /readEditorModifierClick/);
  assert.match(editor, /dispatchEditorModifierClick/);
  assert.match(editor, /onOpenSectionRef/);
  assert.match(editor, /dispatchEditorModifierClick\(click, onOpenSectionRef\.current\)/);
  assert.match(editor, /handleDOMEvents/);
  assert.match(editor, /event\.button !== 0/);
  assert.doesNotMatch(
    editor,
    /mousedown:[\s\S]*preventDefault\(\);\s*return true;/,
  );
  assert.match(editor, /coerceRichTextHref/);
  assert.match(editor, /setModifierLinkMode\(event\.metaKey \|\| event\.ctrlKey\)/);
  assert.match(file, /onOpenSection=\{handlers\.openSection\}/);
  assert.match(file, /onOpenSection=\{handleSectionSelect\}/);
  assert.match(
    css,
    /\[data-modifier-link-mode="true"\] \.ProseMirror \.creed-inline-tag:hover/,
  );
});

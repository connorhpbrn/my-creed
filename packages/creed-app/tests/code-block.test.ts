import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { highlightCreedCode } from "../lib/code-highlighting.ts";
import { parseAnswerBlocks } from "../lib/panel/rich-answer-blocks.ts";

test("registered languages keep syntax colours", () => {
  const tree = highlightCreedCode("const x = 1", "javascript");
  assert.ok(tree?.children.length);
});

test("unknown fences still colour via auto-detect and keep their body", () => {
  const tree = highlightCreedCode("- [x] item\nconst x = 1", "text");
  assert.ok(tree?.children.length);
});

test("Ask code blocks keep the language label and skip copy", () => {
  const blocks = parseAnswerBlocks("```text\nhello world\n```");
  assert.equal(blocks[0]?.kind, "code");
  if (blocks[0]?.kind !== "code") return;
  assert.equal(blocks[0].language, "text");
  assert.equal(blocks[0].text, "hello world");

  const source = readFileSync(
    new URL("../components/creed/code-block.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /uppercase/);
  assert.doesNotMatch(source, /\bCopy\b/);
});

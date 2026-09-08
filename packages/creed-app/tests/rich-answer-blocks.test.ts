import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { HEADERLESS_TABLE_MARK } from "@creed/core/rich-text";
import { creedEditorMarkdownGuide } from "../lib/ai/editor-markdown.ts";
import { parseAnswerBlocks } from "../lib/panel/rich-answer-blocks.ts";
import { buildPanelSystemPrompt } from "../lib/panel/actions.ts";
import { buildAgentSystemPrompt, buildAgentUserPrompt } from "../lib/panel/agent.ts";
import { buildTabSystemPrompt } from "../lib/ai/tab.ts";

test("parseAnswerBlocks reads GFM tables and the headerless mark", () => {
  const headed = parseAnswerBlocks(
    ["| Person | Role |", "| --- | --- |", "| Maya | co-founder |"].join("\n"),
  );
  assert.deepEqual(headed, [
    {
      kind: "table",
      headerless: false,
      headers: ["Person", "Role"],
      rows: [["Maya", "co-founder"]],
    },
  ]);

  const headerless = parseAnswerBlocks(
    [
      HEADERLESS_TABLE_MARK,
      "|  |  |",
      "| --- | --- |",
      "| Maya | co-founder |",
    ].join("\n"),
  );
  assert.equal(headerless[0]?.kind, "table");
  if (headerless[0]?.kind === "table") {
    assert.equal(headerless[0].headerless, true);
    assert.deepEqual(headerless[0].rows, [["Maya", "co-founder"]]);
  }
});

test("parseAnswerBlocks keeps nested bullets and checklists", () => {
  const blocks = parseAnswerBlocks(
    ["- Parent", "  - Child", "- [ ] Open", "- [x] Done"].join("\n"),
  );
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.kind, "list");
  if (blocks[0]?.kind !== "list") return;
  assert.equal(blocks[0].groups[0]?.kind, "bullets");
  assert.equal(blocks[0].groups[0]?.items[0]?.children[0]?.items[0]?.text, "Child");
  assert.equal(blocks[0].groups[1]?.kind, "tasks");
  assert.equal(blocks[0].groups[1]?.items[0]?.checked, false);
  assert.equal(blocks[0].groups[1]?.items[1]?.checked, true);
});

test("the editor and Ask share one task marker implementation", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.creed-list-task > li::before/);
  assert.match(css, /\.creed-list-task > li\[data-checked="true"\]::after/);
  assert.doesNotMatch(css, /\.creed-list-task > li > label > span::after/);
  assert.doesNotMatch(css, /\.creed-ask-prose \.creed-list-item/);
});

test("parseAnswerBlocks maps editor headings, tags, fences, and dividers", () => {
  const blocks = parseAnswerBlocks(
    [
      "# Title",
      "#goals",
      "### Nested",
      "###### Tiny",
      "```js extra",
      "const n = 1;",
      "```",
      "---",
    ].join("\n"),
  );
  assert.deepEqual(
    blocks.map((block) => block.kind),
    ["heading", "paragraph", "heading", "heading", "code", "divider"],
  );
  assert.equal(blocks[0]?.kind === "heading" ? blocks[0].level : 0, 2);
  assert.equal(blocks[1]?.kind === "paragraph" ? blocks[1].text : "", "#goals");
  assert.equal(blocks[2]?.kind === "heading" ? blocks[2].level : 0, 3);
  assert.equal(blocks[3]?.kind === "heading" ? blocks[3].level : 0, 4);
  assert.equal(blocks[4]?.kind === "code" ? blocks[4].language : "", "js");
});

test("Ask, Agent, and Tab prompts teach every native editor block", () => {
  const guide = creedEditorMarkdownGuide("write");
  const answer = creedEditorMarkdownGuide("answer");
  assert.match(guide, /GFM pipe tables/);
  assert.match(guide, /Checklists/);
  assert.match(guide, /creed-table-headerless/);
  assert.match(answer, /Never wrap headings/);
  assert.match(answer, /A fence is only for literal code/);

  const ask = buildPanelSystemPrompt("ask");
  const agent = buildAgentSystemPrompt();
  const tab = buildTabSystemPrompt();
  const draft = buildAgentUserPrompt({
    query: "add a people table",
    sections: [{ id: "people", name: "People", content: "", agentPermission: "propose" }],
    archived: [],
    mentioned: [],
  });

  for (const prompt of [ask, agent, tab, draft]) {
    assert.match(prompt, /\| Person \| Role \|/);
    assert.match(prompt, /- \[ \] item/);
    assert.match(prompt, /==highlight==/);
    assert.match(prompt, /Never wrap headings/);
  }
  assert.match(ask, /Use native editor blocks/);
});

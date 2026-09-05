import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const answer = readFileSync(
  new URL("../components/creed/rich-answer.tsx", import.meta.url),
  "utf8",
);

test("ask answers paint in full on the first frame", () => {
  assert.doesNotMatch(answer, /STAGGER_MS/);
  assert.doesNotMatch(answer, /window\.setInterval/);
  assert.doesNotMatch(answer, /anim\.shown/);
  assert.doesNotMatch(answer, /filter: "blur/);
  assert.match(answer, /<CreedCodeBlock/);
  assert.match(answer, /<hr key=\{index\} className="creed-hr"/);
  assert.match(answer, /\{footer\}/);
});

test("ask marks use the editor highlight and Creed blue", () => {
  assert.match(answer, /className="creed-file-mark"/);
  assert.match(answer, /className="creed-file-underline"/);
  assert.match(answer, /parseInlineMarkdown/);
  assert.match(answer, /accentColorMap\.stack/);
  assert.match(answer, /accentTintMap\.stack/);
  assert.match(answer, /accent="stack"/);
  assert.doesNotMatch(answer, /underline underline-offset-2/);
});

test("ask list markers paint on a real li", () => {
  assert.match(answer, /<li\s+className="creed-list-item"/);
  assert.doesNotMatch(answer, /<motion\.li/);
  assert.doesNotMatch(answer, /<motion\.blockquote/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  coerceInlineHref,
  parseInlineMarkdown,
} from "../lib/panel/rich-answer-inline.ts";

test("highlight and underline nest in either order", () => {
  const underlined = parseInlineMarkdown("__==YOUR==__");
  assert.equal(underlined[0]?.type, "u");
  if (underlined[0]?.type !== "u") return;
  assert.equal(underlined[0].children[0]?.type, "mark");

  const highlighted = parseInlineMarkdown("==__YOUR__==");
  assert.equal(highlighted[0]?.type, "mark");
  if (highlighted[0]?.type !== "mark") return;
  assert.equal(highlighted[0].children[0]?.type, "u");
});

test("underline and highlight stay distinct when used alone", () => {
  const mark = parseInlineMarkdown("==Highlighted text==");
  assert.equal(mark[0]?.type, "mark");
  if (mark[0]?.type !== "mark") return;
  assert.deepEqual(mark[0].children, [{ type: "text", text: "Highlighted text" }]);

  const underline = parseInlineMarkdown("__Highlighted text__");
  assert.equal(underline[0]?.type, "u");
  if (underline[0]?.type !== "u") return;
  assert.deepEqual(underline[0].children, [{ type: "text", text: "Highlighted text" }]);
  assert.equal(parseInlineMarkdown("__dumb__")[0]?.type, "u");
});

test("bare domain links become https and javascript stays inert", () => {
  assert.equal(coerceInlineHref("test.com"), "https://test.com");
  assert.equal(coerceInlineHref("/hello.com"), "https://hello.com");
  assert.equal(coerceInlineHref("https://creed.md"), "https://creed.md");
  assert.equal(coerceInlineHref("javascript:alert(1)"), null);

  const link = parseInlineMarkdown("[way](test.com)");
  assert.equal(link[0]?.type, "link");
  if (link[0]?.type !== "link") return;
  assert.equal(link[0].href, "https://test.com");
  assert.deepEqual(link[0].children, [{ type: "text", text: "way" }]);
});

test("hash tags and section tokens parse as chips", () => {
  const tagged = parseInlineMarkdown("See #Test here");
  assert.equal(tagged[0]?.type, "text");
  assert.equal(tagged[1]?.type, "tag");
  if (tagged[1]?.type !== "tag") return;
  assert.equal(tagged[1].name, "Test");

  const section = parseInlineMarkdown("[[section:goals]]");
  assert.deepEqual(section, [{ type: "section", id: "goals" }]);
});

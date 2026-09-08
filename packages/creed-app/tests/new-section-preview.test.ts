import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("mobile proposal bars hide proposed and keep Accept Reject labels", () => {
  const card = source("components/creed/inline-proposal-diff.tsx");

  assert.match(card, /hidden text-\[var\(--creed-text-tertiary\)\] sm:inline/);
  assert.match(card, /hidden text-\[var\(--creed-success\)\]\/65 sm:inline/);
  assert.match(card, /text-\[var\(--creed-success\)\]\/65">·</);
  assert.match(card, /text-\[var\(--creed-danger\)\]\/65">·</);
  assert.doesNotMatch(card, /<span className="sm:hidden">proposed<\/span>/);
  assert.doesNotMatch(card, /<X className="h-3\.5 w-3\.5 sm:hidden"/);
  assert.doesNotMatch(card, /<Check className="h-3\.5 w-3\.5 sm:hidden"/);
  assert.match(card, /^\s+Reject$/m);
  assert.match(card, /^\s+Accept$/m);
});

test("add-section proposal cards omit the section name", () => {
  const card = source("components/creed/inline-proposal-diff.tsx");
  const newSection = card.slice(
    card.indexOf("export function InlineNewSectionProposal"),
    card.indexOf("export function InlineMetaProposal"),
  );

  assert.doesNotMatch(newSection, /sectionName/);
});

test("new-section proposals render header and body chrome in the file", () => {
  const file = source("components/creed/file-screen.tsx");
  assert.match(file, /function ProposedNewSectionPreview/);
  assert.match(file, /<ProposedNewSectionPreview/);
  assert.match(file, /normalizeRichTextInput\(draft\)/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chart = readFileSync(
  new URL("../components/marketing/creed-bench-chart.tsx", import.meta.url),
  "utf8",
);

test("bench legend uses sidebar-style hover and exclusive series focus", () => {
  assert.match(chart, /type="button"/);
  assert.match(chart, /aria-pressed=\{selected\}/);
  assert.match(chart, /layoutId="bench-legend-highlight"/);
  assert.match(chart, /hover:bg-\[var\(--creed-surface-raised\)\]\/30/);
  assert.match(chart, /selected && "text-\[var\(--creed-text-primary\)\] hover:bg-transparent"/);
  assert.match(chart, /hover:text-\[var\(--creed-text-primary\)\]/);
  assert.match(chart, /bench-series-focus/);
  assert.match(chart, /interactive=\{!dimmed\}/);
  assert.match(
    chart,
    /selectedModel && point\.model !== selectedModel\) return null/,
  );
  assert.doesNotMatch(chart, /opacity-40/);
});

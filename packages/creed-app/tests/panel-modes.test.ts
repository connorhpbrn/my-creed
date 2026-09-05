import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextPanelMode } from "../lib/panel/modes.ts";

test("panel modes cycle from Search to Ask to Agent", () => {
  assert.equal(nextPanelMode("search"), "ask");
  assert.equal(nextPanelMode("ask"), "agent");
  assert.equal(nextPanelMode("agent"), "search");
});

test("the panel icon switches modes on mobile and desktop", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(panel.match(/data-panel-mode-switch/g)?.length, 1);
  assert.match(panel, /onClick=\{cycleMode\}/);
  assert.match(
    panel,
    /data-panel-mode-switch[\s\S]{0,500}hover:bg-\[var\(--creed-surface-raised\)\]/,
  );
  assert.doesNotMatch(
    panel,
    /data-panel-mode-switch[\s\S]{0,500}md:hidden/,
  );
  assert.doesNotMatch(panel, /className="hidden[^"]*md:inline-flex"/);
});

test("panel command rows match the sidebar button height", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panel, /const PANEL_COMMAND_ROW_CLASS =\s*"flex h-8 w-full items-center gap-2\.5/);
  assert.doesNotMatch(panel, /px-2\.5 py-2 text-left text-\[14px\]/);
});

test("panel search field matches the cycle button and shares its inset", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );
  const mention = readFileSync(
    new URL("../components/creed/mention-input.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    panel,
    /flex items-start gap-0\.5 border-b border-\[var\(--creed-border\)\] p-1\.5/,
  );
  assert.match(panel, /className="h-8 w-full bg-transparent text-\[15px\]/);
  assert.match(panel, /min-w-0 flex-1 pl-\[2px\]/);
  assert.doesNotMatch(panel, /h-\[52px\]/);
  assert.match(mention, /min-h-8 w-full whitespace-pre-wrap/);
  assert.doesNotMatch(mention, /min-h-\[52px\]|py-\[15px\]/);
});

test("panel icons play through before they can start again", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panel, /function PanelCommandButton/);
  assert.match(panel, /useAnimatedIconControls\(\)/);
  assert.match(panel, /onMouseEnter=\{\(\) => \{\s*onHover\(\);\s*start\(\);/);
  assert.match(panel, /onMouseLeave=\{settle\}/);
  assert.doesNotMatch(panel, /if \(active\) ref\.current\?\.startAnimation\(\)/);
});

test("panel height springs to the measured content without restarting", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panel, /const PANEL_HEIGHT_SPRING = \{/);
  assert.match(panel, /type: "spring" as const/);
  assert.match(panel, /bounce: 0/);
  assert.match(panel, /animate=\{\{ height: panelHeight \?\? "auto" \}\}/);
  assert.match(panel, /easeHeight && !reduceMotion \? PANEL_HEIGHT_SPRING/);
  assert.doesNotMatch(panel, /creed-panel-resize/);
  assert.doesNotMatch(panel, /height: panelHeight === null \? undefined : panelHeight/);
});

test("proposal command labels keep space around the middot", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panel, /label: `\$\{proposal\.sectionName\} · \$\{proposal\.agentName\}`/);
  assert.match(panel, /<span className="px-\[0\.4em\]">·<\/span>/);
});

test("ask take-me-there rides the answer cascade", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panel, /footer=\{/);
  assert.match(panel, /Take me there <Kbd>↵<\/Kbd>/);
  assert.doesNotMatch(
    panel,
    /<\/RichAnswer>\s*<\/div>\s*\{turn\.actions\.length \?/,
  );
});

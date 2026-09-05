import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("homepage drops the demo and first two sections for a scroll statement", () => {
  const page = source(
    "../../creed-marketing/components/marketing/landing/landing-page.tsx",
  );
  const hero = source(
    "../../creed-marketing/components/auth/landing-hero.tsx",
  );
  const statement = source(
    "../../creed-marketing/components/marketing/landing/scroll-highlight-statement.tsx",
  );
  const governed = source(
    "../../creed-marketing/components/marketing/landing/governed.tsx",
  );
  const activityDemo = source(
    "../components/marketing/how-creed-works-demos.tsx",
  );

  assert.match(page, /ScrollHighlightStatement/);
  assert.doesNotMatch(page, /WhyUseItSection|WhyNotOtherToolsSection|HowItWorksSection/);
  assert.doesNotMatch(hero, /CreedAppDemo/);
  assert.match(hero, /items-center justify-center pb-\[10vh\] text-center/);
  assert.doesNotMatch(hero, /Tell every agent who you are/);
  assert.doesNotMatch(hero, /HeroGitHubButton|View repo/);
  assert.match(hero, /href=\{resolvedHref\}/);
  assert.match(hero, /: "\/pricing"/);
  assert.doesNotMatch(hero, /border-2 border-white\/45/);
  assert.match(hero, /AirplaneIcon/);
  assert.match(hero, /onMouseEnter={[\s\S]*startAnimation/);
  assert.match(hero, /onMouseLeave={[\s\S]*stopAnimation/);
  assert.doesNotMatch(hero, /useGitHubStars|github-star-icon/);
  assert.doesNotMatch(page, /ClosingCtaSection/);
  assert.match(statement, /Your personal information is valuable/);
  assert.match(statement, /It should stay in your control/);
  assert.match(statement, /Creed gives it back to you/);
  assert.match(statement, /accentColorMap\.projects/);
  assert.match(statement, /YOUR_BAR = "rgba\(234, 88, 12, 0\.82\)"/);
  assert.match(statement, /EDITOR_PROSE_PX = 17/);
  assert.match(statement, /YOUR_BOLD_AT = 0\.15/);
  assert.match(statement, /YOUR_CAPS_AT = YOUR_BOLD_AT \+ YOUR_BOLD_DURATION/);
  assert.match(statement, /YOUR_UNDERLINE_AT = YOUR_CAPS_AT \+ YOUR_CAPS_DURATION/);
  assert.match(statement, /YOUR_UNDERLINE_THICKNESS_PX = 4/);
  assert.match(statement, /YOUR_UNDERLINE_OFFSET_PX = 0\.06 \* EDITOR_PROSE_PX - 8/);
  assert.match(statement, /YOUR_MARK_PAD_Y_EM = 0\.03/);
  assert.match(statement, /YOUR_MARK_RADIUS_PX = 10/);
  assert.match(statement, /top: "100%"/);
  assert.match(statement, /marginTop: YOUR_UNDERLINE_OFFSET_PX/);
  assert.match(statement, /height: YOUR_UNDERLINE_THICKNESS_PX/);
  assert.doesNotMatch(statement, /borderRadius: 999/);
  assert.match(statement, /<motion\.mark/);
  assert.match(statement, /<motion\.strong/);
  assert.match(statement, /borderRadius: YOUR_MARK_RADIUS_PX/);
  assert.match(statement, /paddingBlock: yourMarkPadY/);
  assert.doesNotMatch(statement, /yourMarkPadBottom/);
  assert.match(statement, /relative inline whitespace-nowrap align-baseline/);
  assert.doesNotMatch(statement, /creed-file-mark inline-block/);
  assert.doesNotMatch(statement, /<motion\.u/);
  assert.doesNotMatch(statement, /creed-file-underline/);
  assert.doesNotMatch(statement, /textDecorationThickness/);
  assert.doesNotMatch(statement, /borderBottomWidth/);
  assert.doesNotMatch(statement, /paddingBottom: "0\.18em"/);
  assert.match(statement, /relative inline-block align-baseline/);
  assert.match(statement, /invisible inline-block w-max/);
  assert.match(statement, /left-\[-9999px\]/);
  assert.match(statement, /upper\.scrollWidth/);
  assert.doesNotMatch(statement, /editorPx/);
  assert.doesNotMatch(statement, /scaleX: yourUnderline/);
  assert.doesNotMatch(statement, /accentColorMap\.identity/);
  assert.doesNotMatch(statement, /accentColorMap\.stack/);
  assert.doesNotMatch(statement, /accentColorMap\.lemon/);
  assert.doesNotMatch(statement, /🫵/);
  const editorCss = source("../app/globals.css");
  assert.match(editorCss, /\.ProseMirror u,\s*\.creed-file-underline/);
  assert.match(editorCss, /\.ProseMirror mark,\s*\.creed-file-mark/);
  assert.match(statement, /hashOpacity = useTransform\(effect, \(value\) => value \*\* 2\.6 \* 0\.7\)/);
  assert.match(statement, /hashX = useTransform\(effect, \[0, 1\], \["0\.35em", "0em"\]\)/);
  assert.match(statement, /markOpacity = useTransform\(effect, \(value\) => value \*\* 2\.6\)/);
  const chrome = source("../components/marketing/site-chrome.tsx");
  assert.match(
    chrome,
    /<ChevronDown\s+className=\{cn\(\s*"h-3\.5 w-3\.5 transition-transform duration-200 ease-\[cubic-bezier\(0\.22,1,0\.36,1\)\]"/,
  );
  assert.doesNotMatch(chrome, /text-white\/70 group-hover:text-white/);
  assert.doesNotMatch(
    chrome,
    /text-\[var\(--creed-text-tertiary\)\] group-hover:text-\[var\(--creed-text-primary\)\]/,
  );
  assert.match(page, /bg-\[var\(--creed-background\)\]/);
  assert.doesNotMatch(statement, /bg-\[var\(--creed-background\)\]/);
  assert.match(statement, /t-section/);
  assert.doesNotMatch(statement, /\u2014/);
  const features = source(
    "../../creed-marketing/components/marketing/landing/ai-features.tsx",
  );
  assert.match(features, /Models <FileCode>\{\"<inside>\"\}<\/FileCode> the file/);
  assert.doesNotMatch(features, /FileHighlight accent="identity"/);
  assert.match(features, /plateClassName="min-h-\[272px\] lg:min-h-0 \[overflow-anchor:none\]"/);
  assert.doesNotMatch(features, /group: "Pages"|group: "Sections"/);
  const howItWorks = source(
    "../../creed-marketing/components/marketing/landing/how-creed-works.tsx",
  );
  assert.match(howItWorks, /<FileUnderline>/);
  assert.match(howItWorks, /<em>works<\/em>/);
  const fileMarks = source(
    "../../creed-marketing/components/marketing/landing/file-text-marks.tsx",
  );
  assert.match(fileMarks, /TITLE_MARK_RADIUS_PX = 10/);
  assert.match(fileMarks, /TITLE_CODE_RADIUS_PX = 16/);
  assert.match(fileMarks, /TITLE_UNDERLINE_THICKNESS_PX = 4/);
  assert.match(fileMarks, /TITLE_UNDERLINE_OFFSET_PX = 0\.06 \* EDITOR_PROSE_PX - 8/);
  assert.match(fileMarks, /backgroundColor: accentColorMap\[accent\]/);
  assert.doesNotMatch(fileMarks, /rounded-full/);
  assert.doesNotMatch(fileMarks, /creed-file-underline/);
  assert.match(fileMarks, /creed-inline-tag/);
  assert.match(fileMarks, /borderRadius: "0\.24em"/);
  const integrations = source(
    "../../creed-marketing/components/marketing/landing/integrations.tsx",
  );
  assert.match(integrations, /FileTag accent="boundaries"/);
  const roadmapTeaser = source(
    "../../creed-marketing/components/marketing/landing/roadmap-teaser.tsx",
  );
  assert.match(roadmapTeaser, /href="\/roadmap"/);
  assert.match(roadmapTeaser, /<FileItalic>way<\/FileItalic>/);
  const sponsorsTeaser = source(
    "../../creed-marketing/components/marketing/landing/sponsors-teaser.tsx",
  );
  assert.match(sponsorsTeaser, /FileHighlight accent="operating-principles"/);
  assert.match(
    sponsorsTeaser,
    /<FileUnderline accent="operating-principles">community<\/FileUnderline>/,
  );
  const faq = source(
    "../../creed-marketing/components/marketing/landing/faq.tsx",
  );
  assert.match(faq, /FileUnderline accent="boundaries"/);
  assert.match(faq, /<FileStrike>Dumb<\/FileStrike>/);
  assert.doesNotMatch(faq, /Common/);
  assert.match(features, /accentColorMap\.questions/);
  assert.match(features, /SectionAccentMark color=\{TAB_DEMO_ACCENT\}/);
  assert.match(
    features,
    /text-\[var\(--creed-text-primary\)\][\s\S]{0,80}Preferences/,
  );
  assert.match(features, /Search or jump to…/);
  assert.match(features, /Ask about your creed…/);
  assert.match(features, /Tell Creed what to change…/);
  assert.match(features, /Ask about your creed\./);
  assert.match(features, /Tell Creed what to change\./);
  const directEditDemo = source(
    "../components/marketing/governed-demos.tsx",
  );
  assert.match(directEditDemo, /SectionPermissionControl/);
  assert.match(directEditDemo, /DEMO_PERMISSION_OPTIONS/);
  assert.match(directEditDemo, /option\.value !== "read-only"/);
  assert.match(directEditDemo, /pointer-events-none/);
  assert.match(directEditDemo, /Require approval for agent edits/);
  assert.doesNotMatch(directEditDemo, /Review proposed edits first/);
  assert.doesNotMatch(directEditDemo, /needs review/);
  assert.match(directEditDemo, /3w ago/);
  assert.doesNotMatch(features, />proposed</);
  const proposalDemo = functionSource(
    "../components/marketing/governed-demos.tsx",
    "ProposalDemo",
  );
  assert.match(proposalDemo, /expandedId === activeId/);
  assert.doesNotMatch(proposalDemo, /setExpanded\(false\)/);
  const panelHolds = [...features.matchAll(/holdMs: (\d+)/g)].map((match) =>
    Number(match[1]),
  );
  assert.ok(panelHolds.length >= 6);
  assert.ok(panelHolds.every((ms) => ms >= 1600));
  assert.doesNotMatch(features, /Type # to mention a section/);
  assert.doesNotMatch(features, /It follows your agent permissions/);
  assert.match(
    features,
    /flex items-start gap-0\.5 border-b border-\[var\(--creed-border\)\] p-1\.5/,
  );
  assert.match(features, /rounded-\[var\(--radius-lg\)\]/);
  assert.doesNotMatch(features, /Switch to .* mode/);
  assert.doesNotMatch(features, /flex rounded-\[8px\] bg-\[var\(--creed-surface-raised\)\] p-0\.5/);
  assert.match(features, /creed-tab-ghost/);
  assert.match(features, /Tab[\s\S]{0,240}accept[\s\S]{0,280}Esc[\s\S]{0,40}dismiss/);
  assert.doesNotMatch(features, /#06B6D4/);
  assert.doesNotMatch(features, /h-4 w-1 shrink-0 rounded-\[1\.25px\]/);
  assert.match(
    source("../../creed-marketing/components/marketing/landing/plate-card.tsx"),
    /lg:aspect-\[5\/4\]/,
  );
  assert.doesNotMatch(features, /AI inside the file/);
  assert.match(governed, /FileHighlight accent="operating-principles"/);
  assert.match(
    governed,
    /<FileUnderline accent="operating-principles">everything<\/FileUnderline>/,
  );
  assert.match(governed, /FileHighlight accent="stack"/);
  assert.match(governed, /<FileUnderline accent="stack">nothing<\/FileUnderline>/);
  assert.match(governed, /plateColor="var\(--plate-yellow\)"/);
  assert.match(governed, /plateColor="var\(--plate-purple\)"/);
  assert.match(activityDemo, /chamath\.md/);
  assert.doesNotMatch(activityDemo, /Chamath\.md/);
  assert.match(activityDemo, /translate-y-\[1px\] scale-95 bg-\[var\(--creed-border\)\]/);
  assert.match(activityDemo, /ACTIVITY_PRESS_MS = 170/);
  assert.match(activityDemo, /ACTIVITY_SIDEBAR_DELAY_MS = 240/);
  assert.match(activityDemo, /setTimeout\(\(\) => setPressed\(false\), ACTIVITY_PRESS_MS\)/);
  assert.match(activityDemo, /if \(step !== 1\) return;/);
  assert.doesNotMatch(activityDemo, /step !== 1 && step !== 5/);
  assert.doesNotMatch(activityDemo, /DemoCard className="h-\[240px\] overflow-hidden"/);
  assert.match(activityDemo, /resolved \? "grid-rows-\[1fr\]" : "grid-rows-\[0fr\]"/);
  assert.match(activityDemo, /grid-rows-\[1fr\] opacity-100/);
  assert.match(activityDemo, /grid-rows-\[0fr\] opacity-0/);
});

function functionSource(path: string, name: string) {
  const file = source(path);
  const start = file.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} missing in ${path}`);
  const next = file.indexOf("\nfunction ", start + 1);
  return file.slice(start, next === -1 ? undefined : next);
}

test("homepage proposal bars put the chevron after the diff stats", () => {
  for (const bar of [
    functionSource("../components/marketing/how-creed-works-demos.tsx", "MiniProposalDiff"),
    functionSource("../components/marketing/governed-demos.tsx", "DemoProposalDiff"),
  ]) {
    assert.match(bar, /<DiffBadge tone="removed"[\s\S]{0,220}<AnimatedChevronDown/);
    assert.doesNotMatch(bar, /<AnimatedChevronDown[\s\S]*?<DiffBadge/);
    assert.match(bar, /px-3 py-2/);
    assert.match(bar, /rounded-xl/);
    assert.match(bar, /hidden text-\[var\(--creed-text-tertiary\)\] sm:inline/);
    assert.match(bar, /proposed/);
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../public/theme-init.js", import.meta.url),
  "utf8",
);

function runThemeInit({
  stored,
  systemDark,
}: {
  stored: string | null;
  systemDark: boolean;
}) {
  const classes = new Set<string>();
  const style: { colorScheme?: string } = {};
  const document = {
    cookie: "",
    documentElement: {
      classList: {
        toggle(name: string, enabled: boolean) {
          if (enabled) classes.add(name);
          else classes.delete(name);
        },
      },
      style,
    },
  };

  vm.runInNewContext(source, {
    localStorage: { getItem: () => stored },
    matchMedia: () => ({ matches: systemDark }),
    document,
  });

  return { classes, colorScheme: style.colorScheme, cookie: document.cookie };
}

test("the main app follows a dark device theme without a saved preference", () => {
  const result = runThemeInit({ stored: null, systemDark: true });
  assert.equal(result.classes.has("dark"), true);
  assert.equal(result.classes.has("light"), false);
  assert.equal(result.colorScheme, "dark");
  assert.match(result.cookie, /^creed-theme=dark;/);
});

test("the main app follows a light device theme without a saved preference", () => {
  const result = runThemeInit({ stored: null, systemDark: false });
  assert.equal(result.classes.has("dark"), false);
  assert.equal(result.classes.has("light"), true);
  assert.equal(result.colorScheme, "light");
  assert.match(result.cookie, /^creed-theme=light;/);
});

test("a saved Creed theme overrides the device theme", () => {
  const light = runThemeInit({ stored: "light", systemDark: true });
  const dark = runThemeInit({ stored: "dark", systemDark: false });
  assert.equal(light.classes.has("dark"), false);
  assert.equal(light.colorScheme, "light");
  assert.equal(dark.classes.has("dark"), true);
  assert.equal(dark.colorScheme, "dark");
});

test("the main layout keeps hydrated theme changes on the system preference", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const provider = readFileSync(
    new URL("../components/creed/theme-provider.tsx", import.meta.url),
    "utf8",
  );
  assert.match(layout, /<ThemeProvider followSystem>/);
  assert.match(provider, /useState<Theme>\("light"\)/);
  assert.match(provider, /useLayoutEffect/);
  assert.doesNotMatch(provider, /useState<Theme>\(\(\) =>/);
});

test("the main theme bootstrap is an inline blocking head script", async () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const { THEME_INIT_SOURCE } = await import("../lib/theme-init-source.ts");

  assert.equal(THEME_INIT_SOURCE, source);
  assert.match(layout, /dangerouslySetInnerHTML=\{\{ __html: THEME_INIT_SOURCE \}\}/);
  assert.doesNotMatch(layout, /preinit\(/);
  assert.doesNotMatch(layout, /from ["']next\/script["']/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*:root:not\(\.light\):not\(\.dark\)/);
});

test("dynamic app layouts render the saved theme before the client takes over", () => {
  const boundary = readFileSync(
    new URL("../components/creed/initial-theme-boundary.tsx", import.meta.url),
    "utf8",
  );
  const provider = readFileSync(
    new URL("../components/creed/theme-provider.tsx", import.meta.url),
    "utf8",
  );

  assert.match(boundary, /cookies\(\)/);
  assert.match(boundary, /creed-theme/);
  assert.match(boundary, /creed-initial-theme/);
  assert.match(provider, /classList\.remove\("dark", "light"\)/);
});

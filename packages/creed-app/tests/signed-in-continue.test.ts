import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveSignedInContinueHref } from "../lib/marketing/signed-in-continue.ts";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("unpaid users are sent to pricing, never straight into /file", () => {
  assert.equal(resolveSignedInContinueHref(false), "/pricing");
  assert.equal(resolveSignedInContinueHref(true), "/file");
});

test("marketing header Continue uses the shared resume-aware href", () => {
  const chrome = source("../components/marketing/site-chrome.tsx");
  assert.match(chrome, /useEditionContinueHref/);
  assert.match(chrome, /continueHref/);
  assert.doesNotMatch(
    chrome,
    /authState === "signed-in"\s*\?\s*\[\s*\{\s*label:\s*"Continue",\s*href:\s*"\/file"/,
  );
});

test("desktop auth actions stay hidden inside the mobile marketing menu", () => {
  const chrome = source("../components/marketing/site-chrome.tsx");
  const accountAction = chrome.slice(chrome.indexOf('function HeaderAccountLink'));

  assert.match(accountAction, /hidden!.*md:inline-flex!/s);
});

test("mobile marketing brand stays fixed and Start reuses the desktop control", () => {
  const chrome = source("../components/marketing/site-chrome.tsx");
  const accountLink = chrome.slice(chrome.indexOf("function HeaderAccountLink"));

  assert.match(chrome, /<CreedWordmark\s+className="ml-1\.5"/);
  assert.match(chrome, /: "py-1\.5 pl-2\.5 pr-1\.5 md:px-1"/);
  assert.match(chrome, /<HeaderAccountLink[\s\S]*scrolled[\s\S]*mobile/);
  assert.match(accountLink, /mobile \? "inline-flex" : "hidden! md:inline-flex!"/);
  assert.match(accountLink, /signedIn \? continueHref : "\/signup"/);
  assert.match(accountLink, /signedIn \? "Continue" : "Start"/);
  assert.doesNotMatch(accountLink, /scrolled \|\| !signedIn/);
});

test("pricing checkout and every Get Started hero state open pricing", () => {
  const pricing = source("../../creed-cloud/components/marketing/pricing-page-view.tsx");
  const checkout = source("../../creed-cloud/app/api/stripe/checkout/route.ts");
  const hero = source("../../creed-marketing/components/auth/landing-hero.tsx");
  assert.match(pricing, /redirectTo="\/pricing"/);
  assert.match(pricing, /returnTo: "\/pricing"/);
  assert.match(checkout, /cancel_url: `\$\{baseUrl\}\$\{returnTo\}`/);
  assert.match(checkout, /successNext/);
  assert.match(hero, /: "\/pricing"/);
});

test("Go to app keeps the hero visible while navigation is pending", () => {
  const transition = source("../components/marketing/marketing-route-transition.tsx");
  const hero = source("../../creed-marketing/components/auth/landing-hero.tsx");

  assert.match(hero, /data-preserve-hero-content=/);
  assert.match(hero, /authState === "signed-in" && isPaid/);
  assert.match(transition, /link\.hasAttribute\("data-preserve-hero-content"\)/);
  assert.match(transition, /preserveHeroContentOnNextNavigation = true/);
  assert.match(transition, /nearTop && !preserveHeroContent/);
});

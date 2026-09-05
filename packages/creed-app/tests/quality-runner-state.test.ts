import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type * as Runner from "../lib/ai/quality-runner.ts";

const source = ts.transpileModule(
  readFileSync(new URL("../lib/ai/quality-runner.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function harness(fetch: () => Promise<unknown>) {
  const exports = {} as typeof Runner;
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let id = 0;
  const setTimeout = (callback: () => void, delay: number) => {
    timers.set(++id, { callback, delay });
    return id;
  };
  vm.runInNewContext(source, {
    exports,
    require: () => ({ GRANT_MONTHLY_USD: 5, LOW_ALLOWANCE_RATIO: 0.2 }),
    fetch,
    setTimeout,
    clearTimeout: (key: number) => timers.delete(key),
    window: { setTimeout },
  });
  exports.setQualityRunnerScope("creed");
  return {
    runner: exports,
    fire(delay: number) {
      const entry = [...timers].find(([, timer]) => timer.delay === delay);
      assert.ok(entry, `Expected a ${delay}ms timer`);
      timers.delete(entry[0]);
      entry[1].callback();
    },
  };
}

const args = { scopeKey: "creed", sections: [], fingerprint: "baseline:file", readOnly: true };
const response = (payload: unknown) => ({ ok: true, json: async () => payload });
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

test("background reads stay silent, deduplicate and retain the loaded report on timeout", async () => {
  const request = deferred<unknown>();
  const { runner, fire } = harness(() => request.promise);
  const report = { overall: { score: 85 }, sections: [] } as unknown as NonNullable<ReturnType<typeof runner.getQualityRunnerSnapshot>["report"]>;
  runner.setBaselineReport(report);
  const pending = runner.runFullQuality(args);
  assert.equal(runner.runFullQuality(args), pending);
  assert.equal(runner.getQualityRunnerSnapshot().fullRunning, false);
  const rejected = assert.rejects(pending, /Could not refresh analysis status/);
  fire(30_000);
  await rejected;
  assert.equal(runner.getQualityRunnerSnapshot().report, report);
  assert.equal(runner.getInFlightFull(args.scopeKey, args.fingerprint), null);
  request.resolve(response({ report: null }));
  await flush();
  assert.equal(runner.getQualityRunnerSnapshot().report, report);
});

test("real analysis stays loading across scope changes and clears after a hung body read", async () => {
  const body = deferred<unknown>();
  const { runner, fire } = harness(async () => ({ ok: true, json: () => body.promise }));
  const pending = runner.runFullQuality({ ...args, readOnly: false, force: true });
  assert.equal(runner.getQualityRunnerSnapshot().fullRunning, true);
  runner.setQualityRunnerScope("other");
  assert.equal(runner.getQualityRunnerSnapshot().fullRunning, false);
  runner.setQualityRunnerScope("creed");
  assert.equal(runner.getQualityRunnerSnapshot().fullRunning, true);
  await flush();
  const rejected = assert.rejects(pending, /Could not refresh analysis status/);
  fire(30_000);
  await rejected;
  assert.equal(runner.getQualityRunnerSnapshot().fullRunning, false);
  assert.equal(runner.getQualityRunnerSnapshot().lastOutcome?.ok, false);
});

test("background reads show confirmed remote analysis and clear loading after completion", async () => {
  let calls = 0;
  const { runner, fire } = harness(async () => response(++calls === 1
    ? { run: { id: "remote", status: "running" } }
    : calls === 2 ? { run: { id: "remote", status: "completed" } } : { report: null }));
  const pending = runner.runFullQuality(args);
  assert.equal(runner.getQualityRunnerSnapshot().fullRunning, false);
  await flush();
  assert.equal(runner.getQualityRunnerSnapshot().fullRunning, true);
  fire(1_000);
  await pending;
  assert.equal(runner.getQualityRunnerSnapshot().fullRunning, false);
  assert.equal(runner.getQualityRunnerSnapshot().lastOutcome, null);
});

test("hung status polling clears section loading and permits another attempt", async () => {
  let calls = 0;
  const { runner, fire } = harness(() => ++calls === 1
    ? Promise.resolve(response({ run: { id: "section", status: "running" } }))
    : new Promise(() => {}));
  const section = { id: "identity" } as Parameters<typeof runner.runSectionQuality>[0]["section"];
  const pending = runner.runSectionQuality({ ...args, section });
  assert.equal(runner.getQualityRunnerSnapshot().sectionRunning.has("identity"), true);
  await flush();
  fire(1_000);
  await flush();
  const rejected = assert.rejects(pending, /Could not refresh analysis status/);
  fire(30_000);
  await rejected;
  assert.equal(runner.getQualityRunnerSnapshot().sectionRunning.size, 0);
  const retry = runner.runSectionQuality({ ...args, section });
  assert.notEqual(retry, pending);
  assert.equal(runner.getQualityRunnerSnapshot().sectionRunning.has("identity"), true);
  const retryRejected = assert.rejects(retry, /Could not refresh analysis status/);
  fire(30_000);
  await retryRejected;
  assert.equal(runner.getQualityRunnerSnapshot().sectionRunning.size, 0);
});

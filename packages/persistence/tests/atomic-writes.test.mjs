import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const container = process.env.CREED_TEST_DB_CONTAINER;
if (!container) throw new Error("Set CREED_TEST_DB_CONTAINER to an isolated local Supabase database container.");

function sql(query) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-XAt", "-v", "ON_ERROR_STOP=1"]);
    let output = "";
    let error = "";
    child.stdout.on("data", (data) => { output += data; });
    child.stderr.on("data", (data) => { error += data; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
    child.stdin.end(query);
  });
}
const json = (value) => value === null ? "NULL" : `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;

await test("database writes enforce ownership, revisions and all-or-nothing persistence", async (t) => {
  const user = randomUUID(), other = randomUUID(), creed = randomUUID(), second = randomUUID();
  const section = { creed_id: creed, user_id: user, section_id: "identity", position: 0, kind: "rich-text", name: "Identity", accent: "identity", payload: { content: "original" }, revision: 1, last_edited_by: "You", last_edited_type: "user", agent_permission: "hidden" };
  const baseline = { identity: { revision: 1, position: 0, permission: "hidden", archived: false } };
  const settings = { requireApproval: true, versionControl: { repoOwner: "", repoName: "", branch: "" } };
  const vc = { creed_id: creed, provider: "github", path: "creed.md" };
  const claims = `set request.jwt.claims = '${JSON.stringify({ sub: user, role: "service_role" })}';`;
  const commit = (changes, expected = baseline, activity = [], target = creed, actor = user, review = null, remove = []) =>
    `${claims} select public.commit_personal_creed('${target}', '${actor}', ${json(expected)}, ${json(changes)}, '[]', ${json(activity)}, ${json({ ...vc, creed_id: target })}, ARRAY[${remove.map((id) => `'${id}'`).join(",")}]::text[], ARRAY[]::text[], true, ${json(review)}, ${json(settings)});`;
  await sql(`insert into auth.users(id) values ('${user}'), ('${other}');
    insert into public.creeds(id,type,name,owner_user_id) values ('${creed}','personal','Test A','${user}'), ('${second}','personal','Test B','${other}');
    insert into public.creed_members(creed_id,user_id,role) values ('${creed}','${user}','owner'), ('${second}','${other}','owner');
    insert into public.creed_tokens(creed_id,user_id) values ('${creed}','${user}'), ('${second}','${other}');
    insert into public.creed_sections(creed_id,user_id,section_id,position,kind,name,accent,payload,revision,last_edited_by,last_edited_type,agent_permission)
      select creed_id,user_id,section_id,position,kind,name,accent,payload,revision,last_edited_by,last_edited_type,agent_permission from jsonb_populate_record(null::public.creed_sections,${json(section)});`);
  try {
    await t.test("a later invalid activity rolls back section and history writes", async () => {
      await assert.rejects(sql(commit([{ ...section, revision: 2, payload: { content: "must roll back" } }], baseline, [{ id: "invalid", creed_id: creed, user_id: user }])), /null value|not-null/);
      assert.equal(await sql(`select payload->>'content' from public.creed_sections where creed_id='${creed}';`), "original");
      assert.equal(await sql(`select count(*) from public.creed_section_versions where creed_id='${creed}';`), "0");
    });
    await t.test("another owner's Creed cannot receive this snapshot", async () => {
      await assert.rejects(sql(commit([], {}, [], second)), /Unauthorized/);
    });
    await t.test("a row cannot escape the explicitly authorized Creed", async () => {
      await assert.rejects(sql(commit([{ ...section, creed_id: second }])), /Invalid Creed target/);
    });
    await t.test("only one of two concurrent writes to the same baseline succeeds", async () => {
      const outcomes = await Promise.allSettled(["first", "second"].map((content) => sql(commit([{ ...section, revision: 2, payload: { content } }]))));
      assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
      assert.match(String(outcomes.find((outcome) => outcome.status === "rejected")?.reason), /creed_write_conflict|deadlock/);
      assert.equal(await sql(`select count(*) from public.creed_section_versions where creed_id='${creed}';`), "1");
    });
    await t.test("an old snapshot cannot delete a newer section", async () => {
      await assert.rejects(sql(commit([], baseline, [], creed, user, null, ["identity"])), /creed_write_conflict/);
      assert.equal(await sql(`select count(*) from public.creed_sections where creed_id='${creed}';`), "1");
    });
    await t.test("acceptance checks the stored proposal revision and retains a stale draft", async () => {
      const draft = { kind: "rich-text", contentHtml: "stale proposal" };
      await sql(`insert into public.creed_proposals(id,creed_id,user_id,section_id,section_name,accent,agent_name,change_type,reason,impact,confidence,draft,base_revision)
        values ('${creed}-proposal','${creed}','${user}','identity','Identity','identity','Agent','refines-existing','Reason','future-responses','durable',${json(draft)},1);`);
      await assert.rejects(sql(commit([{ ...section, revision: 3 }], { identity: { ...baseline.identity, revision: 2 } }, [], creed, user, { id: `${creed}-proposal`, decision: "accept", draft })), /creed_write_conflict/);
      assert.equal(await sql(`select status from public.creed_proposals where creed_id='${creed}';`), "pending");
    });
    await t.test("emptying a current Creed is an intentional atomic operation", async () => {
      await sql(commit([], { identity: { ...baseline.identity, revision: 2 } }, [], creed, user, null, ["identity"]));
      assert.equal(await sql(`select count(*) from public.creed_sections where creed_id='${creed}';`), "0");
    });
    await t.test("browser roles cannot call the server-only section batch", async () => {
      assert.equal(await sql("select has_function_privilege('authenticated', 'public.commit_creed_section_batch(uuid,jsonb,jsonb,text[],text[],text,jsonb,jsonb)', 'execute');"), "f");
    });
  } finally {
    await sql(`delete from public.creeds where id in ('${creed}','${second}'); delete from auth.users where id in ('${user}','${other}');`);
  }
});

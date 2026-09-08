import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ConnectionItem } from "@creed/core/creed-data";
import {
  getGrantedClientIds,
  hasActiveConnectionIcon,
  listLiveConnectionIcons,
  resolveCliAgentStatuses,
  resolveConnectionStatus,
} from "../lib/mcp-connection-status.ts";

test("connection status includes only tokens granted to the active Creed", () => {
  const clients = getGrantedClientIds(
    [
      { id: "personal-token", client_id: "creed-cli-personal" },
      { id: "shared-token", client_id: "creed-cli-shared" },
      { id: "duplicate-token", client_id: "creed-cli-personal" },
    ],
    new Set(["personal-token", "duplicate-token"]),
  );

  assert.deepEqual(clients, ["creed-cli-personal"]);
});

test("a specifically named active OAuth client connects its own icon", () => {
  assert.equal(
    hasActiveConnectionIcon({
      icon: "cli",
      oauthClientNames: ["Creed CLI"],
    }),
    true,
  );
});

test("historical roster rows cannot revive an expired named client", () => {
  assert.equal(
    hasActiveConnectionIcon({
      icon: "cli",
      oauthClientNames: [],
      rosterClientNames: ["Creed CLI"],
    }),
    false,
  );
});

test("generic active OAuth clients may resolve their JSON-RPC identity", () => {
  assert.equal(
    hasActiveConnectionIcon({
      icon: "codex",
      oauthClientNames: ["MCP Client"],
      rosterClientNames: ["Codex"],
    }),
    true,
  );
});

test("a different specifically named client cannot borrow a roster identity", () => {
  assert.equal(
    hasActiveConnectionIcon({
      icon: "codex",
      oauthClientNames: ["Claude"],
      rosterClientNames: ["Codex"],
    }),
    false,
  );
});

test("CLI attribution is bound to an active OAuth token", () => {
  const statuses = resolveCliAgentStatuses(
    new Set(["active-token"]),
    [
      {
        clientId: "cli-expired-token-claude",
        lastSeenAt: "2026-07-14T12:00:00.000Z",
      },
      {
        clientId: "cli-active-token-codex",
        lastSeenAt: "2026-07-14T13:00:00.000Z",
      },
    ],
  );

  assert.deepEqual(statuses, {
    codex: { lastSeenAt: "2026-07-14T13:00:00.000Z" },
  });
});

test("CLI attribution keeps the newest use across active sessions", () => {
  const statuses = resolveCliAgentStatuses(
    new Set(["token-a", "token-b"]),
    [
      { clientId: "cli-token-a-codex", lastSeenAt: "2026-07-14T12:00:00.000Z" },
      { clientId: "cli-token-b-codex", lastSeenAt: "2026-07-14T13:00:00.000Z" },
    ],
  );

  assert.deepEqual(statuses, {
    codex: { lastSeenAt: "2026-07-14T13:00:00.000Z" },
  });
});

test("CLI attribution rejects malformed and unsupported roster identities", () => {
  const statuses = resolveCliAgentStatuses(
    new Set(["token", "token-with-hyphens"]),
    [
      { clientId: "cli-token-with-hyphens-codex", lastSeenAt: "2026-07-14T13:00:00.000Z" },
      { clientId: "cli-token-unknown-agent", lastSeenAt: "2026-07-14T13:00:00.000Z" },
      { clientId: "cli-other-token-codex", lastSeenAt: "2026-07-14T13:00:00.000Z" },
    ],
  );

  assert.deepEqual(statuses, {
    codex: { lastSeenAt: "2026-07-14T13:00:00.000Z" },
  });
});

function card(status: ConnectionItem["status"], lastUsed?: string): ConnectionItem {
  return {
    id: "cursor",
    name: "Cursor",
    status,
    icon: "cursor",
    description: "",
    connectHint: "",
    lastUsed,
  };
}

test("agent cards light up from the live MCP roster", () => {
  const status = resolveConnectionStatus(card("not-connected"), [
    { id: "cursor-1", name: "Cursor", icon: "cursor", lastUsed: "2m" },
  ]);

  assert.deepEqual(status, {
    kind: "connected",
    isConnected: true,
    lastSeen: "2m",
  });
});

test("a dropped session without revoke degrades to disconnected", () => {
  const status = resolveConnectionStatus(card("connected", "1d"), []);

  assert.deepEqual(status, {
    kind: "disconnected",
    isConnected: false,
    lastSeen: "1d",
  });
});

test("agent cards stay dark when neither roster nor persisted status is connected", () => {
  const status = resolveConnectionStatus(card("not-connected"), [
    { id: "codex-1", name: "Codex", icon: "codex", lastUsed: "now" },
  ]);

  assert.deepEqual(status, { kind: "not-connected", isConnected: false });
});

test("a local revoke override disconnects immediately even if both signals are still connected", () => {
  const status = resolveConnectionStatus(
    card("connected", "1d"),
    [{ id: "cursor-1", name: "Cursor", icon: "cursor", lastUsed: "now" }],
    { revoked: true },
  );

  assert.deepEqual(status, { kind: "not-connected", isConnected: false });
});

test("live OAuth icons beat a stale roster and mark missing agents disconnected", () => {
  const live = resolveConnectionStatus(
    card("connected", "1d"),
    [{ id: "cursor-1", name: "Cursor", icon: "cursor", lastUsed: "1d" }],
    { liveIcons: new Set(["cursor"]) },
  );
  const dropped = resolveConnectionStatus(
    card("connected", "1d"),
    [{ id: "cursor-1", name: "Cursor", icon: "cursor", lastUsed: "1d" }],
    { liveIcons: new Set() },
  );
  assert.deepEqual(live, {
    kind: "connected",
    isConnected: true,
    lastSeen: "1d",
  });
  assert.deepEqual(dropped, {
    kind: "disconnected",
    isConnected: false,
    lastSeen: "1d",
  });
});

test("MCP revoke clears persisted connection status so refresh cannot relight the card", () => {
  const revoke = readFileSync(
    new URL("../app/api/app/mcp/revoke/route.ts", import.meta.url),
    "utf8",
  );
  const screen = readFileSync(
    new URL("../components/creed/connections-screen.tsx", import.meta.url),
    "utf8",
  );

  assert.match(revoke, /\.from\("creed_connections"\)/);
  assert.match(revoke, /status:\s*"not-connected"/);
  assert.match(revoke, /\.eq\("connection_id", icon\)/);
  assert.match(revoke, /sync_updated_at/);
  assert.match(
    screen,
    /setRevokedIcons\([\s\S]*?fetch\("\/api\/app\/mcp\/revoke"/,
  );
  assert.match(screen, /revoked:\s*revokedIcons\.has\(connection\.icon\)/);
});

test("live OAuth names resolve to brand icons and generic clients use the roster", () => {
  assert.deepEqual(listLiveConnectionIcons(["Cursor", "Claude"]), [
    "cursor",
    "claude",
  ]);
  assert.deepEqual(
    listLiveConnectionIcons(["MCP Client"], ["Codex", "Claude Code"]),
    ["codex", "claudecode"],
  );
});

test("connections filters label All types and All statuses", () => {
  const screen = readFileSync(
    new URL("../components/creed/connections-screen.tsx", import.meta.url),
    "utf8",
  );
  const icons = readFileSync(
    new URL("../lib/agent-icon.ts", import.meta.url),
    "utf8",
  );
  assert.match(icons, /label: "All types"/);
  assert.match(icons, /label: "All statuses"/);
  assert.match(icons, /label: "Disconnected"/);
  assert.match(screen, /AGENT_STATUS_FILTER_ITEMS/);
  assert.match(screen, /\/api\/app\/mcp\/live/);
  assert.match(screen, /statusKind=\{kind\}/);
  assert.match(screen, /function AgentsFilterEmpty/);
  assert.match(screen, /lg:col-span-2/);
  assert.match(screen, /min-h-\[156px\]/);
  assert.match(screen, /ConnectIcon/);
  assert.match(screen, /No \$\{typeLabel\} agents yet\./);
});

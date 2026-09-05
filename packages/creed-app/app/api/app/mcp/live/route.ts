import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  getGrantedClientIds,
  listLiveConnectionIcons,
} from "@/lib/mcp-connection-status";
import { getSupabaseAdminClient } from "@creed/persistence/supabase/admin";

// Live OAuth icons for the connections cards. Same token rules as /mcp/test,
// returned as a set so every card can degrade to Disconnected when a session
// dies without an explicit revoke.
export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const creedId = new URL(request.url).searchParams.get("creedId")?.trim() ?? "";
  if (!creedId) {
    return NextResponse.json({ error: "Missing Creed id." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: tokenRows, error: tokenError } = await admin
    .from("oauth_tokens")
    .select("id, client_id")
    .eq("user_id", auth.user.id)
    .is("revoked_at", null)
    .gt("refresh_expires_at", nowIso);
  if (tokenError) {
    return NextResponse.json({ error: "Could not load tokens." }, { status: 500 });
  }

  const activeTokens =
    (tokenRows as { id: string; client_id: string }[] | null) ?? [];
  const tokenIds = activeTokens.map((row) => row.id);
  if (tokenIds.length === 0) {
    return NextResponse.json({ icons: [] });
  }

  const { data: grantRows, error: grantError } = await admin
    .from("oauth_token_creeds")
    .select("token_id")
    .eq("creed_id", creedId)
    .in("token_id", tokenIds);
  if (grantError) {
    return NextResponse.json({ error: "Could not load grants." }, { status: 500 });
  }

  const grantedTokenIds = new Set(
    ((grantRows as { token_id: string }[] | null) ?? []).map(
      (row) => row.token_id,
    ),
  );
  const clientIds = getGrantedClientIds(activeTokens, grantedTokenIds);
  if (clientIds.length === 0) {
    return NextResponse.json({ icons: [] });
  }

  const { data: oauthClients, error: clientError } = await admin
    .from("oauth_clients")
    .select("client_name")
    .in("client_id", clientIds);
  if (clientError) {
    return NextResponse.json({ error: "Could not load clients." }, { status: 500 });
  }
  const oauthClientNames = (
    (oauthClients as { client_name: string }[] | null) ?? []
  ).map((client) => client.client_name);

  const hasGenericClient = oauthClientNames.some(
    (name) => name.trim().toLowerCase() === "mcp client",
  );
  let rosterClientNames: string[] = [];
  if (hasGenericClient) {
    const { data: rosterRows, error: rosterError } = await admin
      .from("creed_mcp_clients")
      .select("client_name")
      .eq("user_id", auth.user.id)
      .eq("creed_id", creedId);
    if (rosterError) {
      return NextResponse.json({ error: "Could not load MCP clients." }, { status: 500 });
    }
    rosterClientNames = (
      (rosterRows as { client_name: string }[] | null) ?? []
    ).map((row) => row.client_name);
  }

  return NextResponse.json({
    icons: listLiveConnectionIcons(oauthClientNames, rosterClientNames),
  });
}

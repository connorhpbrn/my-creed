import { PersistenceConflict } from "@/lib/persistence-baseline";
import { NextResponse } from "next/server";
import { getCreedStateTick, loadActiveCreedState, persistCreedState } from "@/lib/creed-backend";
import { resolveActiveCreed } from "@/lib/creed-context";
import { requireApiAuth } from "@/lib/api-auth";
import { log } from "@/lib/observability";
import { validateCreedState } from "@creed/core/validation/creed-state";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const active = await resolveActiveCreed(auth.supabase, auth.user);
  if (request.headers.get("x-creed-id") && !active) return NextResponse.json({ error: "Creed not found." }, { status: 403 });
  const sinceValue = new URL(request.url).searchParams.get("since");
  const since = sinceValue && /^\d{1,16}$/.test(sinceValue) ? Number(sinceValue) : null;
  const tick = active?.creedId ? await getCreedStateTick(active.creedId) : null;
  if (since !== null && tick !== null && tick <= since) {
    return NextResponse.json({ changed: false, tick });
  }
  const [result, gettingStartedResult] = await Promise.all([
    loadActiveCreedState(auth.supabase, auth.user, active, {
      proposalLimit: 50,
      activityLimit: 50,
    }),
    // The "Get started" checklist rides along on every state GET (PK read,
    // sub-ms) so the client never needs a separate fetch or poll for it.
    active?.creedId
      ? auth.supabase
          .from("creed_getting_started")
          .select("steps, completed_at, dismissed_at")
          .eq("user_id", auth.user.id)
          .eq("creed_id", active.creedId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const row = gettingStartedResult.error
    ? null
    : (gettingStartedResult.data as {
        steps: Record<string, boolean>;
        completed_at: string | null;
        dismissed_at: string | null;
      } | null);
  result.state.gettingStarted = row
    ? {
        steps: row.steps ?? {},
        completedAt: row.completed_at,
        dismissedAt: row.dismissed_at,
      }
    : null;
  return NextResponse.json({ ...result, changed: true, tick });
}

export async function PUT(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const rateLimit = await checkRateLimit({ scope: "state-write", identifier: auth.user.id, limit: 60, windowMs: 60_000 });
  if (!rateLimit.ok) return NextResponse.json({ error: "Too many save requests." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const candidate =
    body && typeof body === "object" && "state" in body
      ? (body as { state: unknown }).state
      : null;

  const parsed = validateCreedState(candidate);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const persistenceBaseline = await persistCreedState(
      auth.supabase,
      auth.user.id,
      parsed.data,
      parsed.data.creedId,
    );
    return NextResponse.json({ ok: true, persistenceBaseline });
  } catch (error) {
    if (error instanceof PersistenceConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    log.error(
      "personal_creed_state_save_failed",
      { userId: auth.user.id },
      error instanceof Error ? error : new Error(String(error)),
    );
    const writeRpcMissing =
      error instanceof Error &&
      error.message.includes("Personal writes are missing from the database API");
    return NextResponse.json(
      {
        error: writeRpcMissing
          ? error.message
          : "Could not save Creed.",
      },
      { status: 500 },
    );
  }
}

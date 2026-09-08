import { NextResponse } from "next/server";
import type { CreedSection } from "@creed/core/creed-data";
import { loadCreedState, persistCreedState } from "@/lib/creed-backend";
import { requireAuthenticatedUser } from "@/lib/github-version-control";
import { resolveManagedSharedCreedId } from "@/lib/creed-context";
import { checkRateLimit } from "@/lib/rate-limit";

type ApplyBody = {
  sections?: CreedSection[];
  remoteSha?: string | null;
  remoteMessage?: string | null;
  remoteCommittedAt?: string | null;
  remoteContentHash?: string | null;
};

export async function POST(request: Request) {
  try {
    const { supabase, user, creedId } = await requireAuthenticatedUser();
    const rateLimit = await checkRateLimit({ scope: "github-pull-apply", identifier: user.id, limit: 10, windowMs: 60_000 });
    if (!rateLimit.ok) return NextResponse.json({ error: "Too many GitHub pull requests." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
    // Applying a GitHub import overwrites sections via the personal full-state
    // persist, which is blocked for shared Creeds; guard it explicitly.
    if (await resolveManagedSharedCreedId(supabase, user)) {
      return NextResponse.json(
        { error: "Pulling from GitHub into a shared Creed isn't supported yet. You can push to GitHub." },
        { status: 400 }
      );
    }
    const body = (await request.json()) as ApplyBody;

    if (!Array.isArray(body.sections) || body.sections.length === 0) {
      return NextResponse.json({ error: "Missing imported sections." }, { status: 400 });
    }

    const result = await loadCreedState(supabase, user, { creedId });
    // Import changes content, never the permissions of an existing section.
    const existingById = new Map(
      result.state.sections.map((section) => [section.id, section])
    );
    const importedSections = body.sections.map((section) => {
      // Older remote files carry no accent marker, so the parser falls back
      // to "custom" (mono). Keep the locally stored color in that case.
      const existing = existingById.get(section.id);
      const accent =
        section.accent === "custom" && existing && !existing.archived
          ? existing.accent
          : section.accent;
      return {
        ...section,
        accent,
        agentWritable: existing?.agentWritable ?? true,
        agentPermission: existing?.agentPermission ?? "propose",
      };
    });
    // Archived sections never appear in the pushed markdown, so a pull must
    // not delete them - they stay restorable from Settings. Retain any that
    // the import didn't reintroduce under the same id.
    const importedIds = new Set(importedSections.map((section) => section.id));
    const retainedArchived = result.state.sections.filter(
      (section) => section.archived && !importedIds.has(section.id)
    );
    const nextState = {
      ...result.state,
      lastSavedAt: Date.now(),
      sections: [...importedSections, ...retainedArchived],
      proposals: [],
      settings: {
        ...result.state.settings,
        versionControl: {
          ...result.state.settings.versionControl,
          lastRemoteSha: body.remoteSha ?? undefined,
          lastRemoteMessage: body.remoteMessage ?? undefined,
          lastRemoteCommittedAt: body.remoteCommittedAt ?? undefined,
          lastSyncedContentHash: body.remoteContentHash ?? undefined,
          syncStatus: "up-to-date" as const,
        },
      },
      mutationTick: result.state.mutationTick + 1,
      sectionRevisions: Object.fromEntries([
        ...body.sections.map((section) => [section.id, 1] as const),
        ...retainedArchived.map(
          (section) =>
            [
              section.id,
              result.state.sectionRevisions?.[section.id] ?? 1,
            ] as const
        ),
      ]),
    };

    await persistCreedState(supabase, user.id, nextState, creedId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = "Could not import Creed from GitHub.";
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 400 }
    );
  }
}

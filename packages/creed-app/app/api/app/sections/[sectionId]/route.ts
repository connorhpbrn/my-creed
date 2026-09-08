import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  updateSharedSection,
  deleteSharedSection,
  setSharedSectionArchived,
  setSharedSectionPermission,
  type SectionWriteResult,
} from "@/lib/shared-sections";
import {
  deletePersonalSection,
  setPersonalSectionArchived,
  setPersonalSectionPermission,
  updatePersonalSectionContent,
} from "@/lib/creed-backend";
import { normalizeAgentPermission } from "@creed/core/creed-data";

type Ctx = { params: Promise<{ sectionId: string }> };

function statusFor(result: Extract<SectionWriteResult, { ok: false }>): number {
  switch (result.code) {
    case "conflict":
      return 409;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    default:
      return 400;
  }
}

// PUT /api/app/sections/[sectionId] { creedId, baseRevision, content?, name?, accent? }
// Shared per-section save. Direct-edit members write; Proposal-only members
// file a proposal. baseRevision conflict returns 409 with the current revision.
export async function PUT(request: Request, ctx: Ctx) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sectionId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as {
    creedId?: unknown;
    baseRevision?: unknown;
    content?: unknown;
    name?: unknown;
    accent?: unknown;
    archived?: unknown;
    agentPermission?: unknown;
  };
  if (typeof b.creedId !== "string") {
    return NextResponse.json({ error: "creedId is required." }, { status: 400 });
  }

  // Archive / restore is a metadata-only lifecycle change (owner/admin), so it
  // takes its own path: no baseRevision, no content write.
  if (typeof b.archived === "boolean") {
    const personalResult = await setPersonalSectionArchived(
      auth.supabase,
      auth.user.id,
      { creedId: b.creedId, sectionId, archived: b.archived },
    );
    const result: SectionWriteResult =
      !personalResult.ok && personalResult.code === "forbidden"
        ? await setSharedSectionArchived({
            creedId: b.creedId,
            user: auth.user,
            sectionId,
            archived: b.archived,
          })
        : personalResult;
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: statusFor(result) });
    }
    return NextResponse.json(result);
  }

  if (typeof b.agentPermission === "string") {
    if (
      b.agentPermission !== "hidden" &&
      b.agentPermission !== "read-only" &&
      b.agentPermission !== "propose" &&
      b.agentPermission !== "direct"
    ) {
      return NextResponse.json(
        { error: "That permission is not available." },
        { status: 400 },
      );
    }
    const agentPermission = normalizeAgentPermission(b.agentPermission);
    const personalResult = await setPersonalSectionPermission(
      auth.supabase,
      auth.user.id,
      { creedId: b.creedId, sectionId, agentPermission },
    );
    const result: SectionWriteResult =
      !personalResult.ok && personalResult.code === "forbidden"
        ? await setSharedSectionPermission({
            creedId: b.creedId,
            user: auth.user,
            sectionId,
            agentPermission,
          })
        : personalResult;
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: statusFor(result) });
    }
    return NextResponse.json(result);
  }

  if (typeof b.baseRevision !== "number") {
    return NextResponse.json({ error: "creedId and baseRevision are required." }, { status: 400 });
  }

  const content = typeof b.content === "string" ? b.content : undefined;
  const name = typeof b.name === "string" ? b.name : undefined;
  const accent = typeof b.accent === "string" ? b.accent : undefined;
  if (content === undefined && name === undefined && accent === undefined) {
    return NextResponse.json(
      { error: "content, name, or accent is required." },
      { status: 400 },
    );
  }

  const personalResult = await updatePersonalSectionContent(
    auth.supabase,
    auth.user.id,
    {
      creedId: b.creedId,
      sectionId,
      baseRevision: b.baseRevision,
      content,
      name,
      accent,
    },
  );
  const result: SectionWriteResult =
    !personalResult.ok && personalResult.code === "forbidden"
      ? await updateSharedSection({
          creedId: b.creedId,
          user: auth.user,
          sectionId,
          baseRevision: b.baseRevision,
          content,
          name,
          accent,
        })
      : personalResult;

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code, currentRevision: result.currentRevision },
      { status: statusFor(result) }
    );
  }
  return NextResponse.json(result);
}

// DELETE /api/app/sections/[sectionId] { creedId } - permanently delete (owner/admin).
export async function DELETE(request: Request, ctx: Ctx) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sectionId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const creedId = body && typeof body === "object" && "creedId" in body ? (body as { creedId: unknown }).creedId : null;
  if (typeof creedId !== "string") {
    return NextResponse.json({ error: "creedId is required." }, { status: 400 });
  }

  const personalResult = await deletePersonalSection(
    auth.supabase,
    auth.user.id,
    { creedId, sectionId },
  );
  const result: SectionWriteResult =
    !personalResult.ok && personalResult.code === "forbidden"
      ? await deleteSharedSection({ creedId, user: auth.user, sectionId })
      : personalResult;
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: statusFor(result) });
  }
  return NextResponse.json(result);
}

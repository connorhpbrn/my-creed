import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { reorderPersonalSections } from "@/lib/creed-backend";
import { reorderSharedSections } from "@/lib/shared-sections";

// POST /api/app/sections/reorder { creedId, sectionIds } - owner/admin reorder
// of a shared Creed's sections. The order persists (section positions) so every
// member picks it up on their next sync. Role is re-checked in the lib.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as { creedId?: unknown; sectionIds?: unknown };
  if (
    typeof b.creedId !== "string" ||
    !Array.isArray(b.sectionIds) ||
    !b.sectionIds.every((id) => typeof id === "string")
  ) {
    return NextResponse.json(
      { error: "creedId and sectionIds are required." },
      { status: 400 },
    );
  }

  const personalResult = await reorderPersonalSections(
    auth.supabase,
    auth.user.id,
    { creedId: b.creedId, sectionIds: b.sectionIds as string[] },
  );
  const result =
    !personalResult.ok && personalResult.code === "forbidden"
      ? await reorderSharedSections({
          creedId: b.creedId,
          user: auth.user,
          sectionIds: b.sectionIds as string[],
        })
      : personalResult;
  if (!result.ok) {
    const status =
      result.code === "forbidden" ? 403 : result.code === "not_found" ? 404 : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }
  return NextResponse.json({ ok: true });
}

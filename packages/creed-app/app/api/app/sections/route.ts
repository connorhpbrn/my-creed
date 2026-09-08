import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { createPersonalSection } from "@/lib/creed-backend";
import { createSharedSection, type SectionCreateResult } from "@/lib/shared-sections";

// POST /api/app/sections { creedId, name, contentHtml?, accent?, insertAfterSectionId?, sectionId? }
// Create a section. Personal Creeds insert directly; shared Creeds keep the
// owner/admin create path. The optional sectionId lets the provider's
// optimistic row and the server row share an id.
function statusFor(result: Extract<SectionCreateResult, { ok: false }>): number {
  switch (result.code) {
    case "exists":
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

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as {
    creedId?: unknown;
    name?: unknown;
    contentHtml?: unknown;
    accent?: unknown;
    insertAfterSectionId?: unknown;
    sectionId?: unknown;
  };
  if (typeof b.creedId !== "string") {
    return NextResponse.json({ error: "creedId is required." }, { status: 400 });
  }
  if (typeof b.name !== "string" || !b.name.trim()) {
    return NextResponse.json({ error: "A section name is required." }, { status: 400 });
  }

  const personalResult = await createPersonalSection(
    auth.supabase,
    auth.user.id,
    {
      creedId: b.creedId,
      name: b.name,
      contentHtml: typeof b.contentHtml === "string" ? b.contentHtml : undefined,
      accent: typeof b.accent === "string" ? b.accent : undefined,
      insertAfterSectionId:
        typeof b.insertAfterSectionId === "string"
          ? b.insertAfterSectionId
          : undefined,
      sectionId: typeof b.sectionId === "string" ? b.sectionId : undefined,
    },
  );
  const result: SectionCreateResult =
    !personalResult.ok && personalResult.code === "forbidden"
      ? await createSharedSection({
          creedId: b.creedId,
          user: auth.user,
          name: b.name,
          contentHtml: typeof b.contentHtml === "string" ? b.contentHtml : undefined,
          accent: typeof b.accent === "string" ? b.accent : undefined,
          insertAfterSectionId:
            typeof b.insertAfterSectionId === "string"
              ? b.insertAfterSectionId
              : undefined,
          sectionId: typeof b.sectionId === "string" ? b.sectionId : undefined,
        })
      : personalResult;

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: statusFor(result) });
  }
  return NextResponse.json(result);
}

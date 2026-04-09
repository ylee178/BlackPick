import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_AVATAR } from "@/lib/fighter-avatar";
import { getFighterPixelPublicUrl } from "@/lib/pixel-files";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const destination = getFighterPixelPublicUrl(id) ?? DEFAULT_AVATAR;

  return NextResponse.redirect(new URL(destination, req.url), {
    status: 307,
    headers: { "Cache-Control": "no-cache" },
  });
}

import { createSupabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Only allow internal relative paths — block open redirect
  const safePath = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return NextResponse.redirect(new URL(safePath, request.url));
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { locales, type Locale } from "@/i18n/locales";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { language } = body;
  if (!language || !locales.includes(language as Locale)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("users")
    .update({ preferred_language: language })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

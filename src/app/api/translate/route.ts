import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type TranslatePayload = {
  comment_id?: string;
  target_locale?: string;
};

const VALID_LOCALES = ["en", "ko", "ja", "pt-BR"] as const;
const LOCALE_TO_LANG: Record<string, string> = {
  en: "en",
  ko: "ko",
  ja: "ja",
  "pt-BR": "pt",
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: TranslatePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { comment_id, target_locale } = payload;

  if (!comment_id || !target_locale) {
    return NextResponse.json({ error: "comment_id and target_locale are required" }, { status: 400 });
  }

  if (!VALID_LOCALES.includes(target_locale as typeof VALID_LOCALES[number])) {
    return NextResponse.json({ error: "Invalid target_locale" }, { status: 400 });
  }

  // Check cache first
  const { data: cached } = await supabase
    .from("comment_translations")
    .select("translated_body")
    .eq("comment_id", comment_id)
    .eq("target_locale", target_locale as "en" | "ko" | "ja" | "pt-BR")
    .single();

  if (cached) {
    return NextResponse.json({ translated_body: cached.translated_body, cached: true });
  }

  // Get original comment
  const { data: comment } = await supabase
    .from("fight_comments")
    .select("body")
    .eq("id", comment_id)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  try {
    const targetLang = LOCALE_TO_LANG[target_locale] ?? "en";
    let translatedBody = "";

    // Try 1: Google Translate free API
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(comment.body)}`;
      const gRes = await fetch(gUrl, { signal: AbortSignal.timeout(5000) });
      if (gRes.ok) {
        const gData = await gRes.json();
        translatedBody = (gData[0] as Array<[string]>)?.map((s) => s[0]).join("") ?? "";
      }
    } catch {
      // Google failed, try fallback
    }

    // Try 2: MyMemory free API (fallback)
    if (!translatedBody) {
      try {
        const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(comment.body)}&langpair=auto|${targetLang}`;
        const mmRes = await fetch(mmUrl, { signal: AbortSignal.timeout(5000) });
        if (mmRes.ok) {
          const mmData = await mmRes.json();
          translatedBody = mmData?.responseData?.translatedText ?? "";
        }
      } catch {
        // Both failed
      }
    }

    if (!translatedBody) {
      return NextResponse.json({ error: "Translation failed" }, { status: 502 });
    }

    // Cache using admin client (bypasses RLS)
    const adminSupabase = createSupabaseAdmin();
    await adminSupabase.from("comment_translations").insert({
      comment_id,
      target_locale: target_locale as "en" | "ko" | "ja" | "pt-BR",
      translated_body: translatedBody,
    });

    return NextResponse.json({ translated_body: translatedBody, cached: false });
  } catch {
    return NextResponse.json({ error: "Translation service error" }, { status: 502 });
  }
}

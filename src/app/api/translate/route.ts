import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type TranslatePayload = {
  comment_id?: string;
  target_locale?: string;
  comment_type?: "fight" | "fighter";
};

const VALID_LOCALES = ["en", "ko", "ja", "es", "zh-CN", "mn", "pt-BR"] as const;
type TranslationLocale = (typeof VALID_LOCALES)[number];
const LOCALE_TO_LANG: Record<string, string> = {
  en: "en",
  ko: "ko",
  ja: "ja",
  es: "es",
  "zh-CN": "zh",
  mn: "mn",
  "pt-BR": "pt",
};

const COMMENT_SOURCES = {
  fight: {
    commentsTable: "fight_comments",
    cacheTable: "comment_translations",
  },
  fighter: {
    commentsTable: "fighter_comments",
    cacheTable: "fighter_comment_translations",
  },
} as const;

type CommentType = keyof typeof COMMENT_SOURCES;

async function findCommentSource(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  commentId: string,
  requestedType?: CommentType,
) {
  const order: CommentType[] = requestedType ? [requestedType] : ["fight", "fighter"];

  for (const type of order) {
    const source = COMMENT_SOURCES[type];
    const { data } = await supabase
      .from(source.commentsTable)
      .select("body")
      .eq("id", commentId)
      .maybeSingle();

    if (data) {
      return {
        type,
        source,
        body: data.body,
      };
    }
  }

  return null;
}

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

  const { comment_id, target_locale, comment_type } = payload;

  if (!comment_id || !target_locale) {
    return NextResponse.json({ error: "comment_id and target_locale are required" }, { status: 400 });
  }

  if (!VALID_LOCALES.includes(target_locale as typeof VALID_LOCALES[number])) {
    return NextResponse.json({ error: "Invalid target_locale" }, { status: 400 });
  }
  const normalizedTargetLocale = target_locale as TranslationLocale;

  if (comment_type && !["fight", "fighter"].includes(comment_type)) {
    return NextResponse.json({ error: "Invalid comment_type" }, { status: 400 });
  }

  const commentSource = await findCommentSource(
    supabase,
    comment_id,
    comment_type as CommentType | undefined,
  );

  if (!commentSource) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const cached =
    commentSource.type === "fight"
      ? await supabase
          .from("comment_translations")
          .select("translated_body")
          .eq("comment_id", comment_id)
          .eq("target_locale", normalizedTargetLocale)
          .maybeSingle()
      : await supabase
          .from("fighter_comment_translations")
          .select("translated_body")
          .eq("comment_id", comment_id)
          .eq("target_locale", normalizedTargetLocale)
          .maybeSingle();

  if (cached.data) {
    return NextResponse.json({
      translated_body: cached.data.translated_body,
      cached: true,
      comment_type: commentSource.type,
    });
  }

  try {
    const targetLang = LOCALE_TO_LANG[target_locale] ?? "en";
    let translatedBody = "";

    // Try 1: Google Translate free API
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(commentSource.body)}`;
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
        const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(commentSource.body)}&langpair=auto|${targetLang}`;
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

    const adminSupabase = createSupabaseAdmin();
    const { error: cacheError } =
      commentSource.type === "fight"
        ? await adminSupabase.from("comment_translations").insert({
            comment_id,
            target_locale: normalizedTargetLocale,
            translated_body: translatedBody,
          })
        : await adminSupabase.from("fighter_comment_translations").insert({
            comment_id,
            target_locale: normalizedTargetLocale,
            translated_body: translatedBody,
          });

    if (cacheError) {
      console.error("Failed to cache translation", cacheError);
    }

    return NextResponse.json({
      translated_body: translatedBody,
      cached: false,
      comment_type: commentSource.type,
    });
  } catch {
    return NextResponse.json({ error: "Translation service error" }, { status: 502 });
  }
}

import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import FighterAvatar from "@/components/FighterAvatar";
import ShareMenu from "@/components/ShareMenu";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { countryCodeToFlag } from "@/lib/flags";
import { getTranslations } from "@/lib/i18n-server";
import type { AppLocale } from "@/lib/localized-name";
import { getLocalizedEventName, getLocalizedFighterName } from "@/lib/localized-name";
import { isValidEventShortId, buildSharePath, buildShareUrl } from "@/lib/share-url";
import { getSiteUrl } from "@/lib/env";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  retroButtonClassName,
  retroPanelClassName,
  RetroLabel,
} from "@/components/ui/retro";
import type { Database } from "@/types/database";

/**
 * Public share page for a user's predictions on a specific event.
 *
 * Data access uses the admin client on purpose — this page is
 * intentionally public and consumed by visitors who don't have sessions.
 * The RLS-free query is scoped tightly to (user_id, event_id) so we
 * never leak predictions the viewer shouldn't see.
 *
 * Caching: ISR with 60s revalidation. Once the event is completed the
 * content is effectively immutable, but keeping a single revalidate
 * window is simpler than branching here — a stale response for 60s is
 * acceptable for a share card.
 */
export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string; username: string; eventShortId: string }>;
};

type FighterRow = Database["public"]["Tables"]["fighters"]["Row"];
type FightRow = Database["public"]["Tables"]["fights"]["Row"];
type PredictionRow = Database["public"]["Tables"]["predictions"]["Row"];
type FightWithFighters = FightRow & {
  fighter_a: FighterRow;
  fighter_b: FighterRow;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username, eventShortId } = await params;
  const data = await loadSharePageData(username, eventShortId);
  if (!data) return { title: "Black Pick" };
  const { profile, event } = data;
  // Localize the event name in metadata so the OG title/description match
  // what the body renders (otherwise Korean viewers see a mixed title in
  // link previews).
  const localizedName = getLocalizedEventName(event, locale as AppLocale, event.name);
  // Pass an explicit absolute URL for the OG `url` field. `metadataBase` in
  // the root layout would also resolve a relative path, but social crawlers
  // can be finicky about canonicalization, so we hand them the full URL.
  const absoluteUrl = buildShareUrl(profile.ring_name, event.id, getSiteUrl());
  return {
    title: `${profile.ring_name} · ${localizedName} | Black Pick`,
    description: `${profile.ring_name}'s predictions for ${localizedName} on BlackPick.`,
    openGraph: {
      title: `${profile.ring_name}'s picks · ${localizedName}`,
      description: "See their picks on BlackPick.",
      url: absoluteUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.ring_name}'s picks · ${localizedName}`,
      description: "See their picks on BlackPick.",
    },
  };
}

/**
 * Loader is wrapped with React `cache()` so `generateMetadata()` and the
 * page component de-dupe their admin DB calls within a single request —
 * otherwise we'd pay for every query twice per ISR regeneration.
 */
const loadSharePageData = cache(async function loadSharePageData(
  username: string,
  eventShortId: string,
) {
  if (!isValidEventShortId(eventShortId)) return null;

  // Decode defensively — a malformed percent-escape would otherwise throw
  // out of the route and 500 the share link (see GPT review #3).
  let decodedUsername: string;
  try {
    decodedUsername = decodeURIComponent(username);
  } catch {
    return null;
  }

  const supabase = createSupabaseAdmin();

  // Username lookup — case-insensitive exact match on ring_name. `.ilike`
  // with no wildcards behaves like `lower(col) = lower(input)`. If two
  // rows differ only in case we treat the link as ambiguous and 404, rather
  // than silently pick one.
  let profile: { id: string; ring_name: string; score: number | null; wins: number | null; losses: number | null } | null;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, ring_name, score, wins, losses")
      .ilike("ring_name", decodedUsername)
      .maybeSingle();
    if (error) return null;
    profile = data;
  } catch {
    return null;
  }
  if (!profile) return null;

  // Event lookup — prefix match on the short id. `.maybeSingle()` returns
  // an error for >1 rows, which we coerce to a 404 so the link is honest
  // instead of guessing.
  let eventRow: { id: string; name: string; date: string; status: "upcoming" | "live" | "completed"; poster_url: string | null } | null;
  try {
    const { data, error } = await supabase
      .from("events")
      .select("id, name, date, status, poster_url")
      .like("id", `${eventShortId}%`)
      .maybeSingle();
    if (error) return null;
    eventRow = data;
  } catch {
    return null;
  }
  if (!eventRow) return null;

  // Fights for the event with both fighters joined.
  const { data: fights } = await supabase
    .from("fights")
    .select(
      `id, event_id, fighter_a_id, fighter_b_id, start_time, status, winner_id, method, round,
       fighter_a:fighters!fighter_a_id(*),
       fighter_b:fighters!fighter_b_id(*)`,
    )
    .eq("event_id", eventRow.id)
    .order("start_time", { ascending: false });

  // Predictions the profile user made on this event.
  const fightIds = (fights ?? []).map((f) => f.id);
  const { data: predictions } =
    fightIds.length > 0
      ? await supabase
          .from("predictions")
          .select("fight_id, winner_id, method, round, is_winner_correct, score")
          .eq("user_id", profile.id)
          .in("fight_id", fightIds)
      : { data: [] as Array<Pick<PredictionRow, "fight_id" | "winner_id" | "method" | "round" | "is_winner_correct" | "score">> };

  return {
    profile,
    event: eventRow,
    fights: (fights ?? []) as FightWithFighters[],
    predictions: predictions ?? [],
  };
});

export default async function ShareEventPredictionsPage({ params }: Props) {
  const { username, eventShortId } = await params;
  const { t, locale } = await getTranslations();

  const data = await loadSharePageData(username, eventShortId);
  if (!data) notFound();

  const { profile, event, fights, predictions } = data;
  const predictionByFightId = new Map(predictions.map((p) => [p.fight_id, p]));
  const localizedEventName = getLocalizedEventName(event, locale, event.name);
  const eventStatusLabel = t(`status.${event.status}`);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      {/* Branded header */}
      <header className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-black uppercase tracking-[0.08em] text-[var(--bp-ink)]"
        >
          <span className="text-[var(--bp-accent)]">BLACK</span>
          <span>PICK</span>
        </Link>
        <ShareMenu
          url={buildSharePath(profile.ring_name, event.id)}
          title={`${profile.ring_name} · ${event.name}`}
          text={t("share.shareText", { username: profile.ring_name, event: event.name })}
        />
      </header>

      {/* Hero: username + event */}
      <section
        className={retroPanelClassName({
          className: "p-6 sm:p-8",
        })}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--bp-muted)]">
          {t("share.eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-[var(--bp-ink)] sm:text-3xl">
          {profile.ring_name}
        </h1>
        <p className="mt-1 text-sm text-[var(--bp-muted)]">
          {t("share.subtitle")}
        </p>
        <div className="mt-5 flex items-center gap-2">
          <RetroLabel size="sm" tone="neutral">
            {eventStatusLabel}
          </RetroLabel>
          <p className="text-sm font-semibold text-[var(--bp-ink)]">
            {localizedEventName}
          </p>
        </div>
      </section>

      {/* Fight cards */}
      <section className="mt-6 space-y-3">
        {fights.length === 0 ? (
          <div className={retroPanelClassName({ className: "p-5 text-center text-sm text-[var(--bp-muted)]" })}>
            {t("share.noFights")}
          </div>
        ) : (
          fights.map((fight) => {
            const prediction = predictionByFightId.get(fight.id) ?? null;
            const pickedFighter =
              prediction?.winner_id === fight.fighter_a_id
                ? fight.fighter_a
                : prediction?.winner_id === fight.fighter_b_id
                  ? fight.fighter_b
                  : null;
            const pickedName = pickedFighter
              ? getLocalizedFighterName(pickedFighter, locale, pickedFighter.name)
              : null;
            const fighterAName = getLocalizedFighterName(
              fight.fighter_a,
              locale,
              fight.fighter_a.name,
            );
            const fighterBName = getLocalizedFighterName(
              fight.fighter_b,
              locale,
              fight.fighter_b.name,
            );
            const isCompleted =
              fight.status === "completed" || fight.status === "cancelled" || fight.status === "no_contest";
            const isCorrect = prediction?.is_winner_correct === true;
            const isWrong = prediction?.is_winner_correct === false;

            return (
              <article
                key={fight.id}
                className={retroPanelClassName({ className: "p-4" })}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--bp-muted)]">
                    {fighterAName} {t("event.vs")} {fighterBName}
                  </p>
                  {isCompleted && prediction ? (
                    <RetroLabel
                      size="sm"
                      tone={isCorrect ? "success" : isWrong ? "danger" : "neutral"}
                    >
                      {isCorrect
                        ? t("prediction.correct")
                        : isWrong
                          ? t("prediction.wrong")
                          : eventStatusLabel}
                    </RetroLabel>
                  ) : null}
                </div>

                {pickedFighter ? (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[#2a2a2a]">
                      {(() => {
                        const avatarUrl = getFighterAvatarUrl(pickedFighter);
                        return avatarUrl ? (
                          <FighterAvatar
                            src={avatarUrl}
                            alt={pickedName ?? ""}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-base font-bold text-[var(--bp-muted)]">
                            {pickedFighter.name.charAt(0)}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--bp-accent)]">
                        {pickedName} {countryCodeToFlag(pickedFighter.nationality)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--bp-muted)]">
                        {[
                          prediction?.method,
                          prediction?.round ? `R${prediction.round}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || t("share.methodNotSet")}
                      </p>
                    </div>
                    {typeof prediction?.score === "number" ? (
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-black tabular-nums text-[var(--bp-accent)]">
                          {prediction.score > 0 ? `+${prediction.score}` : prediction.score}
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--bp-muted)]">
                          {t("prediction.points")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--bp-muted)]">
                    {t("share.noPick")}
                  </p>
                )}
              </article>
            );
          })
        )}
      </section>

      {/* CTA */}
      <section className="mt-10">
        <Link
          href={`/events/${event.id}`}
          className={retroButtonClassName({
            variant: "primary",
            size: "md",
            block: true,
          })}
        >
          {t("share.ctaMakeYourPicks")}
        </Link>
        <p className="mt-3 text-center text-xs text-[var(--bp-muted)]">
          {t("share.ctaSubtitle")}
        </p>
      </section>
    </div>
  );
}

import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedFighterName, getLocalizedFighterSubLabel } from "@/lib/localized-name";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { countryCodeToFlag } from "@/lib/flags";
import { translateWeightClass } from "@/lib/weight-class";
import { RetroEmptyState, retroPanelClassName } from "@/components/ui/retro";
import FighterComments from "@/components/FighterComments";
import FighterAvatar from "@/components/FighterAvatar";
import { parseRecord } from "@/lib/parse-record";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FighterDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  const { t, locale } = await getTranslations();

  const { data: fighter } = await supabase
    .from("fighters")
    .select("id, name, ring_name, name_en, name_ko, record, nationality, weight_class, image_url")
    .eq("id", id)
    .single();

  if (!fighter) {
    return <RetroEmptyState title="Fighter not found" />;
  }

  // Get fight history
  const { data: fights } = await supabase
    .from("fights")
    .select(`
      id, status, winner_id, method, round, start_time,
      fighter_a:fighters!fighter_a_id(id, name, ring_name, name_en, name_ko, nationality),
      fighter_b:fighters!fighter_b_id(id, name, ring_name, name_en, name_ko, nationality),
      event:events!event_id(id, name, date)
    `)
    .or(`fighter_a_id.eq.${id},fighter_b_id.eq.${id}`)
    .in("status", ["completed", "no_contest", "cancelled"])
    .order("start_time", { ascending: false })
    .limit(20);

  // Get user's ring_name for comment avatar
  let currentUserInitial = "?";
  if (authUser) {
    const { data: profile } = await supabase
      .from("users")
      .select("ring_name")
      .eq("id", authUser.id)
      .single();
    currentUserInitial = (profile?.ring_name || authUser.email || "?").charAt(0).toUpperCase();
  }

  const displayName = getLocalizedFighterName(fighter, locale, fighter.name);
  const subLabel = getLocalizedFighterSubLabel(fighter, locale);
  const avatarUrl = getFighterAvatarUrl(fighter);
  const flag = countryCodeToFlag(fighter.nationality);
  const weightClass = fighter.weight_class ? translateWeightClass(fighter.weight_class, locale) : null;

  const { wins, losses, draws } = parseRecord(fighter.record);

  const fightHistory = (fights ?? []).map((f) => {
    const fa = f.fighter_a as Record<string, string | null> | null;
    const fb = f.fighter_b as Record<string, string | null> | null;
    const isA = fa?.id === id;
    const opponent = isA ? fb : fa;
    const won = f.winner_id === id;
    const isNoContest = f.status === "no_contest";
    const isCancelled = f.status === "cancelled";
    const event = f.event as Record<string, string | null> | null;

    return {
      id: f.id,
      opponentName: opponent ? getLocalizedFighterName(opponent as Parameters<typeof getLocalizedFighterName>[0], locale, opponent?.name ?? "") : "?",
      opponentFlag: countryCodeToFlag(opponent?.nationality),
      won,
      isNoContest,
      isCancelled,
      method: f.method,
      round: f.round,
      eventName: event?.name ?? "",
      eventDate: event?.date ?? "",
    };
  });

  return (
    <div>
      {/* Fighter Hero Section */}
      <div className={retroPanelClassName({ className: "relative mb-6 overflow-hidden p-0" })}>
        <div className="flex flex-col items-center pt-6 sm:flex-row sm:items-end sm:pt-0">
          {/* Bust image */}
          <div className="relative h-48 w-48 shrink-0 sm:h-56 sm:w-56">
            <FighterAvatar
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover object-top"
            />
          </div>

          {/* Info overlay */}
          <div className="w-full px-4 pb-4 pt-3 sm:pb-5 sm:pl-0 sm:pr-5 sm:pt-5">
            <h1 className="text-center text-xl font-bold text-[var(--bp-ink)] sm:text-left sm:text-2xl">
              {displayName} {flag}
            </h1>
            {subLabel && (
              <p className="mt-0.5 text-center text-sm text-[var(--bp-muted)] sm:text-left">{subLabel}</p>
            )}
            <div className="mt-3 flex items-center justify-center gap-4 sm:justify-start">
              <div className="flex items-center gap-2 text-lg font-bold">
                <span className="text-[#4ade80]">{wins}W</span>
                <span className="text-[#f87171]">{losses}L</span>
                {draws && <span className="text-[var(--bp-muted)]">{draws}D</span>}
              </div>
              {weightClass && (
                <span className="rounded-lg bg-[var(--bp-card-inset)] px-2.5 py-1 text-xs text-[var(--bp-muted)]">{weightClass}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fight History */}
      {fightHistory.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-[var(--bp-muted)]">{t("fighter.recentFights")}</h2>
          <div className="space-y-1.5">
            {fightHistory.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-[10px] border border-[rgba(255,255,255,0.04)] bg-[#0d0d0d] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${
                    f.isCancelled || f.isNoContest
                      ? "text-[var(--bp-muted)]"
                      : f.won ? "text-[#4ade80]" : "text-[#f87171]"
                  }`}>
                    {f.isCancelled ? "CAN" : f.isNoContest ? "NC" : f.won ? "W" : "L"}
                  </span>
                  <span className="text-sm text-[var(--bp-ink)]">
                    {f.opponentName} {f.opponentFlag}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--bp-muted)]">
                  {f.method && <span>{f.method}{f.round ? ` R${f.round}` : ""}</span>}
                  <span>{f.eventDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <FighterComments
        fighterId={id}
        currentUserInitial={currentUserInitial}
      />
    </div>
  );
}

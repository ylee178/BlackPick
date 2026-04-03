import { getTranslations } from "@/lib/i18n-server";

type Props = {
  status: "upcoming" | "live" | "completed";
};

export default async function EventStatusBadge({ status }: Props) {
  const { t } = await getTranslations();

  const styles = {
    upcoming: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    live: "border-red-500/30 bg-red-500/10 text-red-300",
    completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  }[status];

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${styles}`}
    >
      {t(`event.${status}`)}
    </span>
  );
}

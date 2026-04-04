import { getTranslations } from "@/lib/i18n-server";
import { RetroStatusBadge } from "@/components/ui/retro";

type Props = {
  status: "upcoming" | "live" | "completed";
};

export default async function EventStatusBadge({ status }: Props) {
  const { t } = await getTranslations();

  const tone: "info" | "danger" | "success" =
    status === "upcoming" ? "info" : status === "live" ? "danger" : "success";

  return (
    <RetroStatusBadge tone={tone}>
      {t(`event.${status}`)}
    </RetroStatusBadge>
  );
}

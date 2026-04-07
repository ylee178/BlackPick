export const DEFAULT_AVATAR = "/fighters/default.png";

type FighterAvatarFields = {
  id?: string | null;
  name?: string | null;
  ring_name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  image_url?: string | null;
};

export function getFighterAvatarUrl(fighter: FighterAvatarFields | null | undefined): string {
  if (!fighter) return DEFAULT_AVATAR;
  if (fighter.image_url) return fighter.image_url;
  if (fighter.id) return `/fighters/pixel/${fighter.id}.png`;
  return DEFAULT_AVATAR;
}

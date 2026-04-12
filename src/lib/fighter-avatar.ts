export const DEFAULT_AVATAR = "/fighters/default.png";

type FighterAvatarFields = {
  id?: string | null;
  name?: string | null;
  ring_name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  image_url?: string | null;
  pixel_avatar_url?: string | null;
};

export function getFighterAvatarUrl(fighter: FighterAvatarFields | null | undefined): string {
  if (!fighter) return DEFAULT_AVATAR;
  // BlackPick only exposes pixel art avatars. image_url may contain a
  // crawled real reference photo and must never be served to users — it
  // exists only as a source for pixel generation and admin tooling.
  if (fighter.pixel_avatar_url) return fighter.pixel_avatar_url;

  if (fighter.id) {
    return `/api/fighter-avatar/pixel/${fighter.id}`;
  }

  return DEFAULT_AVATAR;
}

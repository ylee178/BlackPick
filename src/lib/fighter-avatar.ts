export const DEFAULT_AVATAR = "/fighters/default.png";

type FighterAvatarFields = {
  id?: string | null;
  name?: string | null;
  ring_name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  image_url?: string | null;
};

/**
 * Returns the avatar URL for a fighter.
 * If pixelFileSet is provided (server-side), checks file existence.
 * Otherwise returns pixel path and relies on FighterAvatar's onError fallback.
 */
export function getFighterAvatarUrl(
  fighter: FighterAvatarFields | null | undefined,
  pixelFileSet?: Set<string>,
): string {
  if (!fighter) return DEFAULT_AVATAR;
  if (fighter.image_url) return fighter.image_url;

  if (fighter.id) {
    const filename = `${fighter.id}.png`;
    // If we have the file set, do an exact check
    if (pixelFileSet) {
      return pixelFileSet.has(filename)
        ? `/fighters/pixel/${filename}`
        : DEFAULT_AVATAR;
    }
    // Client-side: return pixel path, FighterAvatar handles 404
    return `/fighters/pixel/${filename}`;
  }

  return DEFAULT_AVATAR;
}

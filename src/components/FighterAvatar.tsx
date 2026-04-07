"use client";

const DEFAULT_AVATAR = "/fighters/default.png";

export default function FighterAvatar({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.endsWith(DEFAULT_AVATAR)) {
          target.src = DEFAULT_AVATAR;
        }
      }}
    />
  );
}

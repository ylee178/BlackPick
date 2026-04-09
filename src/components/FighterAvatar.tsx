"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const DEFAULT_AVATAR = "/fighters/default.png";

export default function FighterAvatar({
  src,
  fallbackSrc,
  alt,
  className,
  size = 64,
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  size?: number;
}) {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
      unoptimized={
        imgSrc.startsWith("/fighters/pixel/") ||
        imgSrc.startsWith("/api/fighter-avatar/ref/") ||
        imgSrc.startsWith("/api/fighter-avatar/pixel/")
      }
      onError={() => {
        if (fallbackSrc && imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
          return;
        }

        if (imgSrc !== DEFAULT_AVATAR) setImgSrc(DEFAULT_AVATAR);
      }}
    />
  );
}

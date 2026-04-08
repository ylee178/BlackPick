"use client";

import Image from "next/image";
import { useState } from "react";

const DEFAULT_AVATAR = "/fighters/default.png";

export default function FighterAvatar({
  src,
  alt,
  className,
  size = 64,
}: {
  src: string;
  alt: string;
  className?: string;
  size?: number;
}) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
      unoptimized={imgSrc.startsWith("/fighters/pixel/")}
      onError={() => {
        if (imgSrc !== DEFAULT_AVATAR) setImgSrc(DEFAULT_AVATAR);
      }}
    />
  );
}

import { useMemo, useState } from "react";

export type MenuItemImageSize = "grid" | "card" | "thumb";

type MenuItemImageProps = {
  imageUrl?: string | null;
  imageVersion?: number | null;
  emoji?: string | null;
  name: string;
  size?: MenuItemImageSize;
  className?: string;
};

const sizeClasses: Record<MenuItemImageSize, string> = {
  thumb: "h-10 w-10 rounded-lg",
  grid: "w-full aspect-[4/3] rounded-xl mb-2",
  card: "w-full aspect-[4/3] rounded-2xl mb-3",
};

function buildSrc(imageUrl: string, imageVersion?: number | null): string {
  if (!imageVersion || imageUrl.includes("?v=")) {
    return imageUrl;
  }
  const separator = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${separator}v=${imageVersion}`;
}

export function MenuItemImage({
  imageUrl,
  imageVersion,
  emoji,
  name,
  size = "grid",
  className = "",
}: MenuItemImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const src = useMemo(() => {
    if (!imageUrl || failed) return null;
    return buildSrc(imageUrl, imageVersion);
  }, [failed, imageUrl, imageVersion]);

  const showEmoji = !src || failed;
  const emojiFallback = emoji?.trim() || "🍽️";

  if (showEmoji) {
    const emojiSize = size === "thumb" ? "text-xl" : size === "card" ? "text-4xl" : "text-3xl";
    return (
      <span
        className={`inline-flex items-center justify-center bg-muted/40 ${sizeClasses[size]} ${emojiSize} ${className}`}
        aria-hidden
      >
        {emojiFallback}
      </span>
    );
  }

  return (
    <span className={`relative block overflow-hidden bg-muted/40 ${sizeClasses[size]} ${className}`}>
      {!loaded ? <span className="absolute inset-0 animate-pulse bg-muted" aria-hidden /> : null}
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

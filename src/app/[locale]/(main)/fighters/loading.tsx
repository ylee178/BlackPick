function S({ className }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%] ${className ?? ""}`}
    />
  );
}

export default function FightersLoading() {
  return (
    <div>
      {/* Title */}
      <S className="mb-5 h-8 w-40" />

      {/* Search bar */}
      <S className="mb-4 h-10 w-64 rounded-[10px]" />

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center rounded-[16px] border border-[var(--bp-line)] bg-[var(--bp-card)] p-3"
          >
            <S className="h-20 w-20 rounded-full" />
            <S className="mt-2 h-4 w-20" />
            <S className="mt-1 h-3 w-14" />
            <S className="mt-1 h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

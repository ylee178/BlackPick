function S({ className }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%] ${className ?? ""}`}
    />
  );
}

export default function FighterDetailLoading() {
  return (
    <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
      {/* Hero section */}
      <div className="bg-[#2a2a2a]">
        <div className="grid min-h-[340px] grid-cols-[auto_1fr] sm:min-h-[400px]">
          {/* Image placeholder */}
          <div className="flex w-[200px] items-end justify-center sm:w-[280px] md:w-[320px]">
            <S className="h-[260px] w-[180px] rounded-xl sm:h-[320px] sm:w-[220px]" />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-end pb-8 pr-5 sm:pb-10 sm:pr-8">
            <S className="h-4 w-28" />
            <S className="mt-2 h-12 w-64 sm:h-14 sm:w-80" />
            <div className="mt-3 flex items-center gap-3">
              <S className="h-6 w-6 rounded" />
              <S className="h-7 w-20 rounded-xl" />
            </div>
            <div className="mt-5 flex items-baseline gap-4">
              <S className="h-10 w-16" />
              <S className="h-10 w-14" />
            </div>
          </div>
        </div>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-4 divide-x divide-[rgba(255,255,255,0.06)] border-b border-[rgba(255,255,255,0.06)] bg-[var(--bp-card)]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 py-5">
            <S className="h-7 w-10" />
            <S className="h-3 w-12" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pt-6 sm:px-6">
        {/* Section title */}
        <S className="mb-3 h-3 w-24" />

        {/* Fight history */}
        <div className="rounded-[16px] border border-[var(--bp-line)] bg-[var(--bp-card)]">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.04)] px-4 py-3 last:border-0"
            >
              <S className="h-8 w-8 rounded-lg" />
              <S className="h-9 w-9 rounded-full" />
              <div className="flex-1">
                <S className="h-4 w-28" />
                <S className="mt-1 h-3 w-16" />
              </div>
              <div className="text-right">
                <S className="h-3 w-20" />
                <S className="mt-1 h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

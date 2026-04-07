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
      <div className="flex min-h-[320px] items-center gap-6 bg-[#2a2a2a] px-8 sm:min-h-[380px] sm:gap-10 sm:px-12">
        <S className="h-32 w-32 shrink-0 rounded-full sm:h-40 sm:w-40" />
        <div>
          <S className="h-4 w-28" />
          <S className="mt-3 h-12 w-56 sm:h-14 sm:w-72" />
          <div className="mt-3 flex items-center gap-3">
            <S className="h-5 w-5 rounded" />
            <S className="h-6 w-20 rounded-xl" />
          </div>
          <div className="mt-5 flex items-center gap-4">
            <S className="h-9 w-16" />
            <S className="h-9 w-14" />
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
        <S className="mb-3 h-3 w-24" />
        <div className="rounded-[16px] border border-[var(--bp-line)] bg-[var(--bp-card)]">
          {[...Array(5)].map((_, i) => (
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
              <S className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

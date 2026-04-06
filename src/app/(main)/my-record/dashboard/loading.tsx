function S({ className }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%] ${className ?? ""}`}
    />
  );
}

const dCard = "rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0a0a0a] p-5 sm:p-6";

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Title */}
      <S className="h-10 w-40" />

      {/* Time range tabs */}
      <div className="flex flex-wrap gap-2">
        {[...Array(6)].map((_, i) => (
          <S key={i} className="h-9 w-16 rounded-[10px]" />
        ))}
      </div>

      {/* 2-col layout */}
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Left column */}
        <div className="min-w-0 flex-1 space-y-5">
          {/* Hero card — win rate ring + stats */}
          <div className={dCard}>
            <div className="flex items-center gap-5">
              <S className="h-28 w-28 shrink-0 rounded-full" />
              <div className="space-y-2">
                <S className="h-6 w-32" />
                <S className="h-5 w-20" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-4 border-t border-[rgba(255,255,255,0.06)] pt-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <S className="h-6 w-12" />
                  <S className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>

          {/* Score trend chart */}
          <div className={dCard}>
            <S className="h-4 w-24" />
            <S className="mt-4 h-40 w-full rounded-[8px]" />
          </div>

          {/* Method accuracy — 4 donut rings */}
          <div className={dCard}>
            <S className="h-4 w-28" />
            <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <S className="h-24 w-24 rounded-full" />
                  <S className="h-4 w-16" />
                  <S className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>

          {/* Weight class breakdown */}
          <div className={dCard}>
            <S className="h-4 w-32" />
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[#0d0d0d] p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <S className="h-4 w-16" />
                      <S className="h-3 w-12" />
                    </div>
                    <S className="h-6 w-10" />
                  </div>
                  <div className="mt-2 border-t border-[rgba(255,255,255,0.04)] pt-2">
                    <S className="h-1.5 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — event history */}
        <div className="w-full lg:w-[320px] lg:shrink-0">
          <div className={dCard}>
            <div className="flex items-center gap-2">
              <S className="h-4 w-24" />
              <S className="h-6 w-6 rounded-[6px]" />
            </div>
            <div className="mt-4 space-y-2.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[#0d0d0d] p-3">
                  <div className="flex items-center justify-between">
                    <S className="h-4 w-36" />
                    <S className="h-6 w-14 rounded-[6px]" />
                  </div>
                  <S className="mt-1 h-3 w-20" />
                  <div className="mt-2 flex items-center justify-between">
                    <S className="h-3 w-20" />
                    <S className="h-4 w-10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function S({ className }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%] ${className ?? ""}`}
    />
  );
}

export default function RankingLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <S className="h-8 w-24" />
        <S className="mt-1 h-4 w-48" />
        <div className="mt-3 flex flex-wrap gap-2">
          {["w-16", "w-12", "w-14", "w-20", "w-16", "w-14"].map((w, i) => (
            <S key={i} className={`h-9 ${w} rounded-[10px]`} />
          ))}
        </div>
      </div>

      {/* Table panel */}
      <div className="rounded-[16px] border border-[var(--bp-line)] bg-[var(--bp-card)] p-4">
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[10px] bg-[var(--bp-card-inset)] px-3 py-2.5">
              <S className="h-5 w-7" />
              <S className="h-8 w-8 rounded-full" />
              <S className="h-4 w-24" />
              <S className="ml-auto h-4 w-16" />
              <S className="h-4 w-14" />
              <S className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

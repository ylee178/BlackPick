function S({ className }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%] ${className ?? ""}`}
    />
  );
}

export default function EventsLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <S className="h-8 w-32" />
        <div className="mt-2 flex gap-2">
          <S className="h-6 w-16 rounded-[6px]" />
          <S className="h-6 w-20 rounded-[6px]" />
        </div>
      </div>

      {/* Featured CTA */}
      <S className="h-10 w-40 rounded-[12px]" />

      {/* Section: Upcoming */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <S className="h-4 w-16" />
          <S className="h-4 w-4" />
        </div>
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="retro-inset flex items-center justify-between gap-3 p-3 sm:p-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <S className="h-6 w-16 rounded-[6px]" />
                  <S className="h-4 w-14" />
                </div>
                <S className="h-4 w-52" />
                <S className="h-3 w-24" />
              </div>
              <S className="h-10 w-24 shrink-0 rounded-[12px]" />
            </div>
          ))}
        </div>
      </div>

      {/* Section: Completed */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <S className="h-4 w-16" />
          <S className="h-4 w-4" />
        </div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="retro-inset flex items-center justify-between gap-3 p-3 sm:p-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <S className="h-6 w-14 rounded-[6px]" />
                  <S className="h-4 w-14" />
                </div>
                <S className="h-4 w-48" />
                <S className="h-3 w-24" />
              </div>
              <S className="h-10 w-20 shrink-0 rounded-[12px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

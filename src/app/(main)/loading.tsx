function S({ className }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%] ${className ?? ""}`}
    />
  );
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <div className="rounded-[20px] border border-[var(--bp-line)] bg-[var(--bp-card)] p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <S className="h-6 w-20 rounded-[6px]" />
          <S className="h-6 w-16 rounded-[6px]" />
          <S className="h-4 w-24" />
        </div>
        <S className="mt-4 h-9 w-72 sm:w-96" />
        <S className="mt-2 h-4 w-48" />
        <div className="mt-4 flex items-center gap-3">
          <S className="h-4 w-20" />
          <S className="h-4 w-28" />
        </div>
        <div className="mt-4 flex gap-3">
          <S className="h-10 w-32 rounded-[12px]" />
          <S className="h-10 w-32 rounded-[12px]" />
        </div>
      </div>

      {/* Main grid: fights + sidebar */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        {/* Fight cards */}
        <div>
          <S className="mb-4 h-6 w-28" />
          <div className="flex flex-col gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-[16px] border border-[var(--bp-line)] bg-[var(--bp-card)] p-4">
                {/* Main event badge */}
                {i === 0 && <S className="mb-3 h-6 w-24 rounded-[6px]" />}
                <div className="flex items-center gap-3">
                  {/* Fighter A */}
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <S className="h-16 w-16 rounded-full" />
                    <S className="h-4 w-20" />
                    <S className="h-3 w-14" />
                  </div>
                  {/* VS */}
                  <S className="h-6 w-10 shrink-0" />
                  {/* Fighter B */}
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <S className="h-16 w-16 rounded-full" />
                    <S className="h-4 w-20" />
                    <S className="h-3 w-14" />
                  </div>
                </div>
                {/* Prediction bar */}
                <S className="mt-4 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden flex-col gap-6 lg:flex">
          <S className="h-6 w-28" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-[16px] border border-[var(--bp-line)] bg-[var(--bp-card)] p-4">
              <S className="h-4 w-20" />
              <S className="mt-1 h-3 w-32" />
              <div className="mt-3 space-y-2">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2 py-1">
                    <S className="h-4 w-5" />
                    <S className="h-4 w-24" />
                    <S className="ml-auto h-4 w-14" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

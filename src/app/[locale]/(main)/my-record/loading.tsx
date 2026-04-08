function S({ className }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%] ${className ?? ""}`}
    />
  );
}

export default function MyRecordLoading() {
  return (
    <div>
      {/* Page title */}
      <S className="mb-5 h-8 w-36" />

      {/* Status tabs + toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] p-1">
          <S className="h-8 w-14 rounded-[8px]" />
          <S className="h-8 w-10 rounded-[8px]" />
          <S className="h-8 w-10 rounded-[8px]" />
        </div>
        <div className="flex items-center gap-2">
          <S className="h-10 w-48 rounded-[10px]" />
          <S className="h-10 w-24 rounded-[10px]" />
          <S className="h-10 w-24 rounded-[10px]" />
        </div>
      </div>

      {/* Event groups */}
      <div className="mt-4 space-y-6">
        {[...Array(2)].map((_, g) => (
          <div key={g}>
            {/* Event header */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <S className="h-4 w-40" />
                <S className="h-3 w-20" />
              </div>
              <S className="h-7 w-36 rounded-[8px]" />
            </div>

            {/* Prediction cards */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[#0d0d0d] p-3">
                  <div className="flex items-center gap-3">
                    <S className="h-10 w-10 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <S className="h-4 w-28" />
                      <S className="h-3 w-20" />
                    </div>
                    <S className="h-6 w-10" />
                  </div>
                  <div className="mt-2 border-t border-[rgba(255,255,255,0.04)] pt-2">
                    <S className="h-3 w-24" />
                    <div className="mt-1 flex gap-2">
                      <S className="h-3 w-16" />
                      <S className="h-3 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

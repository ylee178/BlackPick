function S({ className }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%] ${className ?? ""}`}
    />
  );
}

export default function ProfileLoading() {
  return (
    <div>
      <S className="mb-5 h-8 w-32" />
      <div className="rounded-[16px] border border-[var(--bp-line)] bg-[var(--bp-card)] space-y-4 p-4 sm:p-5">
        <div>
          <S className="mb-1.5 h-3 w-12" />
          <S className="h-10 w-full rounded-[8px]" />
        </div>
        <div>
          <S className="mb-1.5 h-3 w-14" />
          <div className="flex gap-2">
            <S className="h-10 flex-1 rounded-[14px]" />
            <S className="h-10 w-20 rounded-[12px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

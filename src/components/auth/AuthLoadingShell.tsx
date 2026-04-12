import { retroPanelClassName } from "@/components/ui/retro";

function AuthSkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,186,60,0.12)] to-[rgba(255,255,255,0.04)] bg-[length:200%_100%] ${className ?? ""}`}
    />
  );
}

type AuthLoadingShellProps = {
  mode?: "login" | "signup" | "reset" | "update";
};

export default function AuthLoadingShell({ mode = "login" }: AuthLoadingShellProps) {
  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isReset = mode === "reset";
  const isUpdate = mode === "update";
  const hasSecondaryProvider = isLogin || isSignup;

  return (
    <div className="flex w-full flex-1 items-center justify-center">
      <section className={retroPanelClassName({ className: "w-full max-w-md p-5 sm:p-6" })}>
        <div className="space-y-2">
          <AuthSkeletonBlock className="h-8 w-48 sm:w-56" />
          <AuthSkeletonBlock className="h-4 w-full max-w-[22rem]" />
          <AuthSkeletonBlock className="h-4 w-3/4 max-w-[16rem]" />
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <AuthSkeletonBlock className="h-4 w-20" />
            <AuthSkeletonBlock className="h-11 w-full rounded-[12px]" />
          </div>

          {isReset ? null : (
            <div className="space-y-2">
              <AuthSkeletonBlock className="h-4 w-24" />
              <AuthSkeletonBlock className="h-11 w-full rounded-[12px]" />
              {isUpdate ? <AuthSkeletonBlock className="h-3 w-36" /> : null}
            </div>
          )}

          {isLogin ? (
            <div className="flex justify-end">
              <AuthSkeletonBlock className="h-3 w-24" />
            </div>
          ) : null}

          <AuthSkeletonBlock className="h-11 w-full rounded-[14px]" />

          {hasSecondaryProvider ? (
            <>
              <div className="flex items-center gap-3">
                <AuthSkeletonBlock className="h-px flex-1" />
                <AuthSkeletonBlock className="h-3 w-8" />
                <AuthSkeletonBlock className="h-px flex-1" />
              </div>
              <AuthSkeletonBlock className="h-11 w-full rounded-[14px]" />
            </>
          ) : null}

          <div className="flex justify-center">
            <AuthSkeletonBlock className="h-4 w-40" />
          </div>
        </div>
      </section>
    </div>
  );
}

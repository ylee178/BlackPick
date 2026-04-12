import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingButtonContentProps = {
  loading: boolean;
  children: ReactNode;
  loadingLabel?: ReactNode;
  icon?: ReactNode;
  className?: string;
  spinnerClassName?: string;
};

export default function LoadingButtonContent({
  loading,
  children,
  loadingLabel,
  icon,
  className,
  spinnerClassName,
}: LoadingButtonContentProps) {
  return (
    <span className={cn("inline-flex items-center justify-center gap-2", className)}>
      {loading ? (
        <Loader2
          className={cn("h-4 w-4 shrink-0 animate-spin", spinnerClassName)}
          strokeWidth={2}
        />
      ) : icon ? (
        <span className="flex shrink-0 items-center justify-center">{icon}</span>
      ) : null}
      <span>{loading ? (loadingLabel ?? children) : children}</span>
    </span>
  );
}

"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";

type PendingSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loadingLabel?: ReactNode;
  icon?: ReactNode;
  spinnerClassName?: string;
};

export default function PendingSubmitButton({
  children,
  loadingLabel,
  icon,
  spinnerClassName,
  disabled,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      {...props}
    >
      <LoadingButtonContent
        loading={pending}
        loadingLabel={loadingLabel}
        icon={icon}
        spinnerClassName={spinnerClassName}
      >
        {children}
      </LoadingButtonContent>
    </button>
  );
}

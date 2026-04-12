import type { ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";

/**
 * Minimal layout for public share routes (`/p/{username}/{eventShortId}`).
 *
 * This intentionally skips the main app chrome (nav, account dropdown,
 * notification bell, onboarding modals). A shared prediction page is
 * consumed by people who clicked a link from outside the app — we do not
 * want to dump them into the product shell. They get a branded frame,
 * the picks, and a single CTA to start predicting themselves.
 *
 * ToastProvider is mounted so the client-side ShareMenu copy-link
 * confirmation has somewhere to render.
 */
export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-dvh bg-[var(--bp-bg)] text-[var(--bp-ink)]">
        {children}
      </div>
    </ToastProvider>
  );
}

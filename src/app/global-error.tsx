"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0a0a0a", color: "#e5e5e5", fontFamily: "sans-serif" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              padding: "2rem",
              border: "1px solid #333",
              borderRadius: "16px",
              textAlign: "center",
              background: "#141414",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              Something went wrong
            </h2>
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#888" }}>
              A critical error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                padding: "0.5rem 1.5rem",
                borderRadius: "12px",
                border: "none",
                background: "#d4a017",
                color: "#0a0a0a",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

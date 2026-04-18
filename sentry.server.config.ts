// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { scrubEvent, scrubTransaction } from "@/lib/sentry-scrub";

// NOTE: do not enable includeLocalVariables — sentry-scrub.ts does not cover
// frames[].vars, so stack-frame locals would ship unredacted.

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  beforeSendTransaction: scrubTransaction,
});

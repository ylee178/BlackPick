import { NextResponse } from "next/server";

/**
 * TEMPORARY — manual Sentry verification endpoint.
 *
 * Throws a known error so we can confirm Sentry is capturing exceptions
 * on the production deployment. Delete this file after confirming the
 * error shows up in the Sentry dashboard.
 */
export async function GET() {
  throw new Error(
    `Sentry verification error @ ${new Date().toISOString()} — safe to ignore, delete after confirming`,
  );
  // Unreachable, but satisfies the "must return Response" type.
  return NextResponse.json({ ok: true });
}

import type {
  ErrorEvent,
  Event,
  EventHint,
  TransactionEvent,
} from "@sentry/core";

/**
 * Sentry `beforeSend` PII scrubber.
 *
 * BlackPick handles user email + ring_name + user_id as identity data.
 * Any of these can leak into Sentry through Supabase error messages,
 * breadcrumb URLs (e.g., `/fighters/{uuid}`), request bodies (prediction
 * payloads), or caller-supplied `extra` context. This module redacts
 * known PII keys and pattern-matches email / UUID / JWT in free-form
 * strings before the event leaves the client.
 *
 * Philosophy: be a touch over-aggressive. Losing a UUID in a stack trace
 * is cheap; leaking a user email to a third-party is not.
 */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

// Share-URL pattern: `/p/{ringName}/{eventShortId}` per src/lib/share-url.ts.
// Ring name is arbitrary user-chosen text — no pattern rule can match it — so
// we redact it at the known URL shape instead. (Leave the /{eventShortId}
// suffix intact; it's a non-identifying 10-hex prefix of an event UUID.)
const SHARE_URL_RE = /(\/p\/)[^/?#]+/g;

const PII_KEYS = new Set([
  "email",
  "ring_name",
  "ringname",
  "password",
  "token",
  "authorization",
  "cookie",
  "set-cookie",
  "access_token",
  "refresh_token",
  "x-supabase-auth",
  "contactemail",
  "contact_email",
]);

export function redactString(value: string): string {
  return value
    .replace(SHARE_URL_RE, "$1[ringname]")
    .replace(EMAIL_RE, "[email]")
    .replace(JWT_RE, "[jwt]")
    .replace(UUID_RE, "[uuid]");
}

const REDACTED = "[redacted]";
const MAX_DEPTH = 6;

export function scrubDeep(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) {
    return value.map((item) => scrubDeep(item, depth + 1));
  }
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      out[key] = REDACTED;
    } else {
      out[key] = scrubDeep(inner, depth + 1);
    }
  }
  return out;
}

function scrubCommon<T extends Event>(event: T): T {
  // Never send user identity to Sentry — we don't need per-user error attribution
  // for MVP triage, and losing it drops the whole `users.*` attribute class.
  delete event.user;

  if (event.request) {
    if (event.request.headers) {
      const headers = { ...event.request.headers } as Record<string, string>;
      for (const key of Object.keys(headers)) {
        if (PII_KEYS.has(key.toLowerCase())) {
          headers[key] = REDACTED;
        }
      }
      event.request.headers = headers;
    }
    if (event.request.cookies) {
      event.request.cookies = { _scrubbed: REDACTED };
    }
    if (event.request.data !== undefined) {
      event.request.data = scrubDeep(event.request.data);
    }
    if (typeof event.request.url === "string") {
      event.request.url = redactString(event.request.url);
    }
    // query_string may be string | object | [string, string][] per SDK types
    if (typeof event.request.query_string === "string") {
      event.request.query_string = redactString(event.request.query_string);
    } else if (
      event.request.query_string &&
      typeof event.request.query_string === "object"
    ) {
      event.request.query_string = scrubDeep(
        event.request.query_string,
      ) as typeof event.request.query_string;
    }
  }

  if (event.message && typeof event.message === "string") {
    event.message = redactString(event.message);
  }

  // `event.transaction` = Sentry's route/transaction name field. On tracing
  // events and error events correlated to a route, this defaults to the URL
  // path — which on share pages is `/p/{ringname}/...`. Redact it at the
  // same layer as the URL body.
  if (typeof event.transaction === "string") {
    event.transaction = redactString(event.transaction);
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message:
        typeof b.message === "string" ? redactString(b.message) : b.message,
      data: b.data
        ? (scrubDeep(b.data) as Record<string, unknown>)
        : b.data,
    }));
  }

  if (event.extra) {
    event.extra = scrubDeep(event.extra) as Record<string, unknown>;
  }

  if (event.contexts) {
    event.contexts = scrubDeep(event.contexts) as Record<
      string,
      Record<string, unknown>
    >;
  }

  if (event.tags) {
    event.tags = scrubDeep(event.tags) as typeof event.tags;
  }

  return event;
}

export function scrubEvent(
  event: ErrorEvent,
  _hint?: EventHint,
): ErrorEvent | null {
  scrubCommon(event);

  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (typeof ex.value === "string") {
        ex.value = redactString(ex.value);
      }
    }
  }

  return event;
}

export function scrubTransaction(
  event: TransactionEvent,
  _hint?: EventHint,
): TransactionEvent | null {
  scrubCommon(event);

  if (event.spans) {
    event.spans = event.spans.map((span) => ({
      ...span,
      description:
        typeof span.description === "string"
          ? redactString(span.description)
          : span.description,
      data: span.data
        ? (scrubDeep(span.data) as typeof span.data)
        : span.data,
    }));
  }

  return event;
}

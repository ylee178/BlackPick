import { describe, expect, it } from "vitest";
import type { ErrorEvent, TransactionEvent } from "@sentry/core";
import {
  redactString,
  scrubDeep,
  scrubEvent,
  scrubTransaction,
} from "./sentry-scrub";

describe("redactString", () => {
  it("redacts an email inside free text", () => {
    expect(redactString("failed for alice@example.com last time")).toBe(
      "failed for [email] last time",
    );
  });

  it("redacts a UUID inside free text", () => {
    expect(
      redactString("parent 550e8400-e29b-41d4-a716-446655440000 missing"),
    ).toBe("parent [uuid] missing");
  });

  it("redacts a JWT-shaped token", () => {
    expect(
      redactString(
        "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123",
      ),
    ).toBe("Authorization: Bearer [jwt]");
  });

  it("handles multiple hits in one string", () => {
    const input = "user alice@a.io with id 550e8400-e29b-41d4-a716-446655440000";
    expect(redactString(input)).toBe("user [email] with id [uuid]");
  });

  it("is a no-op on clean strings", () => {
    expect(redactString("generic error occurred")).toBe("generic error occurred");
  });

  it("redacts the ringname segment in share URLs — /p/{ringname}/{shortId}", () => {
    expect(redactString("/p/Alice/0123456789")).toBe("/p/[ringname]/0123456789");
  });

  it("redacts /p/{ringname} at the end of a path with no trailing segment", () => {
    expect(redactString("/p/Alice")).toBe("/p/[ringname]");
  });

  it("redacts ringname in an absolute share URL", () => {
    expect(
      redactString("visited https://blackpick.io/p/Alice/0123456789 earlier"),
    ).toBe("visited https://blackpick.io/p/[ringname]/0123456789 earlier");
  });

  it("redacts URL-encoded non-ASCII ringnames (e.g. Korean ring names)", () => {
    // %ED%8C%8C%EC%9D%B4%ED%84%B0 === "파이터" URI-encoded
    expect(redactString("/p/%ED%8C%8C%EC%9D%B4%ED%84%B0/0123456789")).toBe(
      "/p/[ringname]/0123456789",
    );
  });
});

describe("scrubDeep", () => {
  it("redacts keys on the PII list regardless of value", () => {
    const input = {
      email: "alice@example.com",
      ring_name: "Alice",
      body: "fine body",
    };
    expect(scrubDeep(input)).toEqual({
      email: "[redacted]",
      ring_name: "[redacted]",
      body: "fine body",
    });
  });

  it("recurses into nested objects", () => {
    const input = {
      user: { email: "a@a.io", id: "550e8400-e29b-41d4-a716-446655440000" },
    };
    expect(scrubDeep(input)).toEqual({
      user: { email: "[redacted]", id: "[uuid]" },
    });
  });

  it("walks arrays", () => {
    const input = [{ email: "a@a.io" }, "clean string", "x@x.com"];
    expect(scrubDeep(input)).toEqual([
      { email: "[redacted]" },
      "clean string",
      "[email]",
    ]);
  });

  it("matches PII keys case-insensitively", () => {
    const input = { Email: "a@a.io", RingName: "Alice", TOKEN: "abc" };
    expect(scrubDeep(input)).toEqual({
      Email: "[redacted]",
      RingName: "[redacted]",
      TOKEN: "[redacted]",
    });
  });

  it("truncates after excessive nesting (no infinite recursion)", () => {
    let obj: Record<string, unknown> = { leaf: "a@a.io" };
    for (let i = 0; i < 10; i++) obj = { nested: obj };
    const result = JSON.stringify(scrubDeep(obj));
    expect(result).toContain("[truncated]");
  });

  it("passes through non-string non-object primitives", () => {
    expect(scrubDeep(42)).toBe(42);
    expect(scrubDeep(true)).toBe(true);
    expect(scrubDeep(null)).toBe(null);
  });
});

describe("scrubEvent", () => {
  it("drops the user identity block entirely", () => {
    const event: ErrorEvent = {
      type: undefined,
      user: { id: "user-123", email: "a@a.io", username: "alice" },
    };
    const out = scrubEvent(event);
    expect(out?.user).toBeUndefined();
  });

  it("redacts PII headers + replaces cookies block", () => {
    const event: ErrorEvent = {
      type: undefined,
      request: {
        headers: {
          authorization: "Bearer eyJfoo",
          "content-type": "application/json",
          cookie: "sb-auth-token=eyJfoo; other=x",
        },
        cookies: { "sb-auth-token": "eyJfoo" },
      },
    };
    const out = scrubEvent(event);
    expect(out?.request?.headers?.authorization).toBe("[redacted]");
    expect(out?.request?.headers?.["content-type"]).toBe("application/json");
    expect(out?.request?.cookies).toEqual({ _scrubbed: "[redacted]" });
  });

  it("redacts UUIDs + emails in request url and query string", () => {
    const event: ErrorEvent = {
      type: undefined,
      request: {
        url: "https://blackpick.io/fighters/550e8400-e29b-41d4-a716-446655440000?email=a@a.io",
        query_string: "email=a@a.io&lang=ko",
      },
    };
    const out = scrubEvent(event);
    expect(out?.request?.url).toBe("https://blackpick.io/fighters/[uuid]?email=[email]");
    expect(out?.request?.query_string).toBe("email=[email]&lang=ko");
  });

  it("redacts patterns inside exception messages", () => {
    const event: ErrorEvent = {
      type: undefined,
      exception: {
        values: [
          {
            type: "Error",
            value:
              "Supabase select failed for users.email=alice@example.com id=550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      },
    };
    const out = scrubEvent(event);
    expect(out?.exception?.values?.[0]?.value).toBe(
      "Supabase select failed for users.email=[email] id=[uuid]",
    );
  });

  it("redacts breadcrumb messages + data", () => {
    const event: ErrorEvent = {
      type: undefined,
      breadcrumbs: [
        {
          message: "fetched /api/users/550e8400-e29b-41d4-a716-446655440000",
          data: { user_id: "550e8400-e29b-41d4-a716-446655440000", email: "a@a.io" },
        },
      ],
    };
    const out = scrubEvent(event);
    expect(out?.breadcrumbs?.[0]?.message).toBe("fetched /api/users/[uuid]");
    expect(out?.breadcrumbs?.[0]?.data?.user_id).toBe("[uuid]");
    expect(out?.breadcrumbs?.[0]?.data?.email).toBe("[redacted]");
  });

  it("scrubs extra context", () => {
    const event: ErrorEvent = {
      type: undefined,
      extra: {
        payload: { email: "a@a.io", note: "contact at b@b.io" },
      },
    };
    const out = scrubEvent(event);
    expect(
      (out?.extra?.payload as Record<string, unknown> | undefined)?.email,
    ).toBe("[redacted]");
    expect(
      (out?.extra?.payload as Record<string, unknown> | undefined)?.note,
    ).toBe("contact at [email]");
  });

  it("returns the same event reference (in-place mutation OK)", () => {
    const event: ErrorEvent = { type: undefined, extra: { foo: "bar" } };
    expect(scrubEvent(event)).toBe(event);
  });

  it("redacts patterns in top-level event.message", () => {
    const event: ErrorEvent = {
      type: undefined,
      message: "login failed for alice@example.com",
    };
    const out = scrubEvent(event);
    expect(out?.message).toBe("login failed for [email]");
  });

  it("scrubs event.contexts recursively — key match redacts, value match pattern-redacts", () => {
    const event: ErrorEvent = {
      type: undefined,
      contexts: {
        app: {
          email: "alice@a.io", // key on PII list → [redacted]
          custom_note: "user is alice@a.io", // free-form string → [email]
        },
        trace: {
          trace_id: "550e8400-e29b-41d4-a716-446655440000",
          span_id: "abc123",
        },
      } as unknown as NonNullable<ErrorEvent["contexts"]>,
    };
    const out = scrubEvent(event);
    expect((out?.contexts?.app as Record<string, unknown>)?.email).toBe(
      "[redacted]",
    );
    expect((out?.contexts?.app as Record<string, unknown>)?.custom_note).toBe(
      "user is [email]",
    );
    expect((out?.contexts?.trace as Record<string, unknown>)?.trace_id).toBe(
      "[uuid]",
    );
  });

  it("scrubs event.tags with PII keys", () => {
    const event: ErrorEvent = {
      type: undefined,
      tags: {
        route: "/api/feedback",
        email: "alice@a.io",
        ring_name: "Alice",
      } as Record<string, string>,
    };
    const out = scrubEvent(event);
    expect((out?.tags as Record<string, string>)?.route).toBe("/api/feedback");
    expect((out?.tags as Record<string, string>)?.email).toBe("[redacted]");
    expect((out?.tags as Record<string, string>)?.ring_name).toBe("[redacted]");
  });

  it("handles query_string as an object form (not a string)", () => {
    const event: ErrorEvent = {
      type: undefined,
      request: {
        query_string: {
          email: "a@a.io",
          lang: "ko",
        } as unknown as string,
      },
    };
    const out = scrubEvent(event);
    const qs = out?.request?.query_string as unknown as Record<string, string>;
    expect(qs.email).toBe("[redacted]");
    expect(qs.lang).toBe("ko");
  });

  it("redacts ringname inside event.transaction (Sentry's route field)", () => {
    const event: ErrorEvent = {
      type: undefined,
      transaction: "GET /p/Alice/0123456789",
    };
    const out = scrubEvent(event);
    expect(out?.transaction).toBe("GET /p/[ringname]/0123456789");
  });

  it("handles query_string as a [key, value][] tuple array", () => {
    const event: ErrorEvent = {
      type: undefined,
      request: {
        query_string: [
          ["email", "a@a.io"],
          ["lang", "ko"],
        ] as unknown as string,
      },
    };
    const out = scrubEvent(event);
    const qs = out?.request?.query_string as unknown as [string, string][];
    // Tuples are arrays of arrays; each value string gets pattern-redacted
    expect(qs[0][1]).toBe("[email]");
    expect(qs[1][1]).toBe("ko");
  });
});

describe("scrubTransaction", () => {
  it("applies common scrubbing to transaction events", () => {
    const event: TransactionEvent = {
      type: "transaction",
      user: { id: "user-123", email: "a@a.io" },
      extra: { email: "b@b.io" },
      tags: { ring_name: "Alice" } as Record<string, string>,
    };
    const out = scrubTransaction(event);
    expect(out?.user).toBeUndefined();
    expect((out?.extra as Record<string, unknown>)?.email).toBe("[redacted]");
    expect((out?.tags as Record<string, string>)?.ring_name).toBe("[redacted]");
  });

  it("redacts spans[].description and spans[].data", () => {
    const event: TransactionEvent = {
      type: "transaction",
      spans: [
        {
          span_id: "abc",
          trace_id: "xyz",
          description:
            "GET /api/users/550e8400-e29b-41d4-a716-446655440000?email=a@a.io",
          data: { email: "a@a.io", ring_name: "Alice" },
          start_timestamp: 0,
        } as unknown as NonNullable<TransactionEvent["spans"]>[0],
      ],
    };
    const out = scrubTransaction(event);
    const span = out?.spans?.[0];
    expect(span?.description).toBe("GET /api/users/[uuid]?email=[email]");
    const data = span?.data as unknown as Record<string, unknown>;
    expect(data.email).toBe("[redacted]");
    expect(data.ring_name).toBe("[redacted]");
  });

  it("leaves transaction events without spans intact", () => {
    const event: TransactionEvent = {
      type: "transaction",
      extra: { foo: "bar" },
    };
    expect(() => scrubTransaction(event)).not.toThrow();
  });
});

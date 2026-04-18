/**
 * Pure validator for user feedback submissions.
 * Used by POST /api/feedback. No runtime deps — safe to import from client
 * for symmetric validation if needed.
 */

export const FEEDBACK_CATEGORIES = ["bug", "ux", "question", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_BODY_MIN = 1;
export const FEEDBACK_BODY_MAX = 8000;

// Minimal RFC-5322-ish email check. Server does not re-verify; this is UI-facing
// only — Resend handles rejections at send time for the final authoritative check.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FeedbackValidationError =
  | "category_invalid"
  | "body_empty"
  | "body_too_long"
  | "contact_email_invalid";

export interface FeedbackInput {
  category: unknown;
  body: unknown;
  contactEmail?: unknown;
}

export interface FeedbackValid {
  category: FeedbackCategory;
  body: string;
  contactEmail: string | null;
}

export type FeedbackValidationResult =
  | { ok: true; data: FeedbackValid }
  | { ok: false; error: FeedbackValidationError };

export function validateFeedback(input: FeedbackInput): FeedbackValidationResult {
  const categoryRaw = typeof input.category === "string" ? input.category.trim().toLowerCase() : "";
  if (!(FEEDBACK_CATEGORIES as readonly string[]).includes(categoryRaw)) {
    return { ok: false, error: "category_invalid" };
  }

  const bodyRaw = typeof input.body === "string" ? input.body.trim() : "";
  if (bodyRaw.length < FEEDBACK_BODY_MIN) {
    return { ok: false, error: "body_empty" };
  }
  if (bodyRaw.length > FEEDBACK_BODY_MAX) {
    return { ok: false, error: "body_too_long" };
  }

  let contactEmail: string | null = null;
  if (input.contactEmail !== undefined && input.contactEmail !== null && input.contactEmail !== "") {
    if (typeof input.contactEmail !== "string") {
      return { ok: false, error: "contact_email_invalid" };
    }
    const trimmed = input.contactEmail.trim();
    if (trimmed.length > 0) {
      if (!EMAIL_RE.test(trimmed)) {
        return { ok: false, error: "contact_email_invalid" };
      }
      contactEmail = trimmed;
    }
  }

  return {
    ok: true,
    data: {
      category: categoryRaw as FeedbackCategory,
      body: bodyRaw,
      contactEmail,
    },
  };
}

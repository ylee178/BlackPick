import { describe, expect, it } from "vitest";
import {
  FEEDBACK_BODY_MAX,
  FEEDBACK_CATEGORIES,
  validateFeedback,
} from "./feedback-validation";

describe("validateFeedback", () => {
  describe("valid inputs", () => {
    it.each(FEEDBACK_CATEGORIES)("accepts every allowlisted category: %s", (category) => {
      const result = validateFeedback({ category, body: "Real feedback" });
      expect(result).toEqual({
        ok: true,
        data: { category, body: "Real feedback", contactEmail: null },
      });
    });

    it("accepts valid contactEmail for anon submissions", () => {
      const result = validateFeedback({
        category: "bug",
        body: "hi",
        contactEmail: "anon@example.com",
      });
      expect(result).toEqual({
        ok: true,
        data: { category: "bug", body: "hi", contactEmail: "anon@example.com" },
      });
    });

    it("treats missing contactEmail as null (authed submissions)", () => {
      const result = validateFeedback({ category: "question", body: "q" });
      expect(result.ok && result.data.contactEmail).toBe(null);
    });

    it("treats empty-string contactEmail as null", () => {
      const result = validateFeedback({ category: "other", body: "b", contactEmail: "" });
      expect(result.ok && result.data.contactEmail).toBe(null);
    });

    it("normalizes category case + whitespace", () => {
      const result = validateFeedback({ category: "  BUG  ", body: "x" });
      expect(result.ok && result.data.category).toBe("bug");
    });

    it("trims body whitespace but keeps inner content", () => {
      const result = validateFeedback({ category: "ux", body: "   line one\nline two   " });
      expect(result.ok && result.data.body).toBe("line one\nline two");
    });

    it("accepts unicode body including Korean + emoji", () => {
      const result = validateFeedback({ category: "ux", body: "버그있어요 🐛" });
      expect(result.ok && result.data.body).toBe("버그있어요 🐛");
    });

    it("accepts body at exact max length", () => {
      const maxBody = "a".repeat(FEEDBACK_BODY_MAX);
      const result = validateFeedback({ category: "other", body: maxBody });
      expect(result.ok).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects non-allowlisted category", () => {
      const result = validateFeedback({ category: "spam", body: "x" });
      expect(result).toEqual({ ok: false, error: "category_invalid" });
    });

    it("rejects non-string category", () => {
      const result = validateFeedback({ category: 42, body: "x" });
      expect(result).toEqual({ ok: false, error: "category_invalid" });
    });

    it("rejects empty body", () => {
      const result = validateFeedback({ category: "bug", body: "" });
      expect(result).toEqual({ ok: false, error: "body_empty" });
    });

    it("rejects whitespace-only body", () => {
      const result = validateFeedback({ category: "bug", body: "   \n\t  " });
      expect(result).toEqual({ ok: false, error: "body_empty" });
    });

    it("rejects body exceeding max length", () => {
      const tooLong = "a".repeat(FEEDBACK_BODY_MAX + 1);
      const result = validateFeedback({ category: "bug", body: tooLong });
      expect(result).toEqual({ ok: false, error: "body_too_long" });
    });

    it("rejects invalid email shape", () => {
      const result = validateFeedback({
        category: "bug",
        body: "x",
        contactEmail: "not-an-email",
      });
      expect(result).toEqual({ ok: false, error: "contact_email_invalid" });
    });

    it("rejects non-string contactEmail", () => {
      const result = validateFeedback({ category: "bug", body: "x", contactEmail: 123 });
      expect(result).toEqual({ ok: false, error: "contact_email_invalid" });
    });

    it("rejects email with internal whitespace", () => {
      const result = validateFeedback({
        category: "bug",
        body: "x",
        contactEmail: "a b@example.com",
      });
      expect(result).toEqual({ ok: false, error: "contact_email_invalid" });
    });
  });
});

import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { findAuthUserByEmail } from "./auth-user-search";

function makeUser(email: string) {
  return { id: email, email } as User;
}

describe("findAuthUserByEmail", () => {
  it("keeps paging past the old 10-page limit until it finds the target user", async () => {
    const perPage = 2;
    const targetEmail = "target@example.com";
    const listUsers = vi.fn(async ({ page }: { page: number; perPage: number }) => {
      if (page < 12) {
        return {
          users: [makeUser(`user-${page}-a@example.com`), makeUser(`user-${page}-b@example.com`)],
          total: 24,
        };
      }

      return {
        users: [makeUser(targetEmail), makeUser("tail@example.com")],
        total: 24,
      };
    });

    const found = await findAuthUserByEmail(targetEmail, listUsers, { perPage });

    expect(found?.email).toBe(targetEmail);
    expect(listUsers).toHaveBeenCalledTimes(12);
  });

  it("stops when the last page is shorter than perPage", async () => {
    const listUsers = vi.fn(async ({ page }: { page: number; perPage: number }) => {
      if (page === 1) {
        return { users: [makeUser("one@example.com"), makeUser("two@example.com")], total: 3 };
      }

      return { users: [makeUser("three@example.com")], total: 3 };
    });

    const found = await findAuthUserByEmail("missing@example.com", listUsers, { perPage: 2 });

    expect(found).toBeNull();
    expect(listUsers).toHaveBeenCalledTimes(2);
  });
});

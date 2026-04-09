import type { User } from "@supabase/supabase-js";

type AuthListUsersPage = {
  users: User[];
  total?: number;
};

type ListUsersFn = (params: {
  page: number;
  perPage: number;
}) => Promise<AuthListUsersPage>;

export async function findAuthUserByEmail(
  email: string,
  listUsers: ListUsersFn,
  options?: { perPage?: number },
) {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = options?.perPage ?? 200;
  let page = 1;

  while (true) {
    const data = await listUsers({ page, perPage });
    const matchedUser =
      data.users.find((user) => user.email?.toLowerCase() === normalizedEmail) ?? null;

    if (matchedUser) {
      return matchedUser;
    }

    const totalPages = data.total ? Math.ceil(data.total / perPage) : null;
    if (data.users.length < perPage || (totalPages !== null && page >= totalPages)) {
      break;
    }

    page += 1;
  }

  return null;
}

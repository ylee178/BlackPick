import { NextResponse } from "next/server";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { defaultLocale } from "@/i18n/locales";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getUser } from "@/lib/supabase-server";

export async function isAdminUser(user: Pick<User, "id" | "email"> | null) {
  if (!user) return false;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve admin role", error);
    return false;
  }

  return Boolean(data);
}

export async function requireAdminPage(options?: { loginPath?: string }) {
  const user = await getUser();
  if (!user) {
    redirect(options?.loginPath ?? `/${defaultLocale}/login`);
  }

  if (!(await isAdminUser(user))) {
    notFound();
  }

  return user;
}

export async function requireAdminApi() {
  const user = await getUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!(await isAdminUser(user))) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user, response: null };
}

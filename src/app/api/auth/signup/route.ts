import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { findAuthUserByEmail } from "@/lib/auth-user-search";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function findExistingAuthUserByEmail(email: string) {
  const admin = createSupabaseAdmin();
  return findAuthUserByEmail(email, async ({ page, perPage }) => {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }
    return data;
  });
}

function isConfirmedUser(user: User) {
  return Boolean(user.confirmed_at || user.email_confirmed_at);
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_payload" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ code: "invalid_email" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ code: "password_too_short" }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    const existingUser = await findExistingAuthUserByEmail(email);

    if (existingUser) {
      if (isConfirmedUser(existingUser)) {
        return NextResponse.json({ code: "user_exists" }, { status: 409 });
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
      });

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ mode: "confirmed_existing" });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return NextResponse.json({ code: "user_exists" }, { status: 409 });
      }

      throw error;
    }

    return NextResponse.json({ mode: "created", userId: data.user?.id ?? null });
  } catch (error) {
    console.error("Failed to create auth user", error);

    return NextResponse.json({ code: "unexpected_error" }, { status: 500 });
  }
}

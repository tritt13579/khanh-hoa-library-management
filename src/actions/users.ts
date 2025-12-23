"use server";

import { createClient } from "@/auth/server";
import { supabaseAdmin } from "@/lib/admin";
import { handleError } from "@/lib/utils";

export const loginAction = async (email: string, password: string) => {
  try {
    const { auth } = await createClient();
    const { data, error } = await auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      // Try to detect whether the account exists but the email is not confirmed yet.
      try {
        // Use admin client to list users and find by email.
        const listRes: any = await supabaseAdmin.auth.admin.listUsers();
        const users = listRes?.data?.users || listRes?.users || [];
        const found = users.find((u: any) => u.email === email);
        if (found && !found.email_confirmed_at) {
          return { errorMessage: "Chưa xác thực email. Vui lòng kiểm tra hộp thư để xác thực.", role: null };
        }
      } catch (e) {
        // ignore and fall through to throw original error
      }

      throw error;
    }

    const userId = data.user.id;

    const { data: readerData } = await supabaseAdmin
      .from("reader")
      .select("reader_id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (readerData) {
      return { errorMessage: null, role: "reader" };
    }

    const { data: staffData } = await supabaseAdmin
      .from("staff")
      .select("staff_id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (staffData) {
      return { errorMessage: null, role: "staff" };
    }

    return {
      errorMessage: "Không xác định được vai trò người dùng.",
      role: null,
    };
  } catch (error) {
    return { ...handleError(error), role: null };
  }
};

export const logOutAction = async () => {
  try {
    const { auth } = await createClient();

    const {
      data: { user },
      error: userError,
    } = await auth.getUser();

    if (userError || !user) throw userError;

    const userId = user.id;

    let role: "reader" | "staff" | null = null;

    const { data: readerData } = await supabaseAdmin
      .from("reader")
      .select("reader_id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (readerData) role = "reader";

    const { data: staffData } = await supabaseAdmin
      .from("staff")
      .select("staff_id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (staffData) role = "staff";

    const { error: signOutError } = await auth.signOut();
    if (signOutError) throw signOutError;

    return { errorMessage: null, role };
  } catch (error) {
    return { ...handleError(error), role: null };
  }
};

export const signUpAction = async (email: string) => {
  try {
    const { auth } = await createClient();

    const { data, error } = await auth.signUp({
      email,
      password: "123456",
    });
    if (error) throw error;

    const userId = data.user?.id;
    if (!userId) throw new Error("Error signing up");

    return { errorMessage: null };
  } catch (error) {
    return handleError(error);
  }
};

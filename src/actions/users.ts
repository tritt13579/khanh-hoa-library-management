"use server";

import { createClient } from "@/auth/server";
import { supabaseAdmin } from "@/lib/admin";
import { handleError } from "@/lib/utils";

export const loginAction = async (email: string, password: string) => {
  try {
    const { auth } = await createClient();
    const { data, error } = await auth.signInWithPassword({ email, password });

    if (error || !data.user) throw error;

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

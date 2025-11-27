// app/api/role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";
import { createClient } from "@/auth/server";

export async function GET(req: NextRequest) {
  try {
    const { auth } = await createClient();
    const { data: user, error: userError } = await auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { role: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = user.user.id;
    let role = null;

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

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json(
      { role: null, error: "Failed to fetch role" },
      { status: 500 },
    );
  }
}

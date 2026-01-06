import { NextResponse } from "next/server";
import { createClient, getUser } from "@/auth/server";

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Find reader by auth_user_id
    const { data: readerData, error: readerErr } = await supabase
      .from("reader")
      .select("reader_id")
      .eq("auth_user_id", user.id)
      .single();

    if (readerErr || !readerData) {
      return NextResponse.json({ success: false, error: "Reader profile not found" }, { status: 404 });
    }

    const readerId = readerData.reader_id;

    const { data, error } = await supabase
      .from("notification")
      .select(
        `notification_id, reservation_id, loan_transaction_id, notification_type, message, created_date, is_read`
      )
      .eq("reader_id", readerId)
      .order("created_date", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("/api/notifications error", err);
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

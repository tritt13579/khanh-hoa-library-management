import { NextResponse } from "next/server";
import { createClient, getUser } from "@/auth/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { notification_ids } = body || {};

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // find reader
    const { data: readerData, error: readerErr } = await supabase
      .from("reader")
      .select("reader_id")
      .eq("auth_user_id", user.id)
      .single();

    if (readerErr || !readerData) {
      return NextResponse.json({ success: false, error: "Reader profile not found" }, { status: 404 });
    }

    const readerId = readerData.reader_id;

    if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      // Ensure only notifications belonging to this reader are updated
      const { data, error } = await supabase
        .from("notification")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("notification_id", notification_ids)
        .eq("reader_id", readerId)
        .select("notification_id");

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: (data || []).map((d: any) => d.notification_id) });
    }

    // Mark all unread for this reader
    const { data, error } = await supabase
      .from("notification")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("reader_id", readerId)
      .eq("is_read", false)
      .select("notification_id");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: (data || []).map((d: any) => d.notification_id) });
  } catch (err: any) {
    console.error("/api/notifications/mark-read error", err);
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin;

    // Delegate expired-hold processing and triggers to DB RPC which handles atomic operations.
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "process_expired_holds_and_trigger_next",
      {
        p_hold_hours: 24,
      }
    );

    if (rpcError) throw rpcError;

    return NextResponse.json({ success: true, data: rpcData });
  } catch (error: any) {
    console.error("Error checking expired reservations:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check expired reservations",
      },
      { status: 500 }
    );
  }
}

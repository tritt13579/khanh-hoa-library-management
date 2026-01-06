import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { book_title_id } = body;

    if (!book_title_id) {
      return NextResponse.json(
        {
          success: false,
          error: "book_title_id is required",
        },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    const { data: rpcData, error: rpcError } = await supabase.rpc("trigger_next_for_book", {
      p_book_title_id: book_title_id,
      p_hold_hours: 24,
    });

    if (rpcError) throw rpcError;

    return NextResponse.json({ success: true, data: rpcData });
  } catch (error: any) {
    console.error("Error triggering next reservation:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to trigger next reservation",
      },
      { status: 500 }
    );
  }
}

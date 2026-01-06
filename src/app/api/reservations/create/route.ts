import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { card_id, book_title_id } = body;

    if (!card_id || !book_title_id) {
      return NextResponse.json(
        {
          success: false,
          error: "card_id and book_title_id are required",
        },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // 1. Check if reader has < 3 active reservations
    const { data: activeReservations, error: countError } = await supabase
      .from("reservation")
      .select("reservation_id")
      .eq("card_id", card_id)
      .in("reservation_status", ["Chờ xử lý", "Sẵn sàng"]);

    if (countError) throw countError;

    if (activeReservations && activeReservations.length >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Độc giả đã đạt giới hạn 3 đặt trước đang hoạt động",
        },
        { status: 400 }
      );
    }

    // 2. Check if reader already has a reservation for this book
    const { data: existingReservation, error: existingError } = await supabase
      .from("reservation")
      .select("reservation_id")
      .eq("card_id", card_id)
      .eq("book_title_id", book_title_id)
      .in("reservation_status", ["Chờ xử lý", "Sẵn sàng"]);

    if (existingError) throw existingError;

    if (existingReservation && existingReservation.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Độc giả đã có đặt trước cho sách này",
        },
        { status: 400 }
      );
    }

    // 3. Delegate allocation to DB RPC for atomicity and concurrency safety
    // We expect a PL/pgSQL function `allocate_reservation_hold(p_card_id int, p_book_title_id int, p_hold_hours int)`
    // to be created in the database. Call it and return its JSON result.

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "allocate_reservation_hold",
      {
        p_card_id: card_id,
        p_book_title_id: book_title_id,
        p_hold_hours: 24,
      }
    );

    if (rpcError) throw rpcError;

    // rpcData is expected to be a JSON object returned by the function.
    // If the RPC returned an error object (e.g., { success: false, error: ... }), propagate as failure.
    const rpcResult: any = Array.isArray(rpcData) && rpcData.length === 1 ? rpcData[0] : rpcData;
    if (!rpcResult || rpcResult.success === false) {
      return NextResponse.json({ success: false, error: rpcResult?.error || 'allocate_reservation_hold failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: rpcResult });
  } catch (error: any) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create reservation",
      },
      { status: 500 }
    );
  }
}

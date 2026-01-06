import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { card_id, book_title_id, loan_transaction_id } = body;

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

    // Check if there's an active reservation for this reader and book
    const { data: reservations, error: reservationError } = await supabase
      .from("reservation")
      .select("reservation_id, reservation_status")
      .eq("card_id", card_id)
      .eq("book_title_id", book_title_id)
      .in("reservation_status", ["Chờ xử lý", "Sẵn sàng"])
      .limit(1);

    if (reservationError) throw reservationError;

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active reservation found for this book and reader",
        fulfilled: false,
      });
    }

    const reservation = reservations[0];

    // Mark reservation as fulfilled
    const { error: updateError } = await supabase
      .from("reservation")
      .update({
        reservation_status: "Đã hoàn thành",
      })
      .eq("reservation_id", reservation.reservation_id);

    if (updateError) throw updateError;

    // Remove from queue
    const { error: queueDeleteError } = await supabase
      .from("reservationqueue")
      .delete()
      .eq("reservation_id", reservation.reservation_id);

    if (queueDeleteError) throw queueDeleteError;

    // Remove any reservation hold associated with this reservation
    await supabase.from("reservation_hold").delete().eq("reservation_id", reservation.reservation_id);

    return NextResponse.json({
      success: true,
      message: "Reservation fulfilled successfully",
      fulfilled: true,
      reservation_id: reservation.reservation_id,
    });
  } catch (error: any) {
    console.error("Error fulfilling reservation:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fulfill reservation",
      },
      { status: 500 }
    );
  }
}
